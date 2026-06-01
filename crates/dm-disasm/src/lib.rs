use std::cell::RefCell;
use std::collections::HashSet;
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use std::sync::OnceLock;

use auxtools::*;

mod disasm_env;
mod output;

use disasm_env::DmDisassembleEnv;
use output::{BytecodeInstruction, BytecodeProc, DisassemblyResult};

thread_local! {
    static RETURN_STRING: RefCell<CString> = RefCell::new(CString::default());
}

static EMPTY_STRING: c_char = 0;

/// Builtin proc paths from 516.1681 stddef.dm
static BUILTIN_PROCS: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn builtin_procs() -> &'static HashSet<&'static str> {
    BUILTIN_PROCS.get_or_init(|| {
        include_str!("builtins.txt")
            .lines()
            .filter(|l| !l.is_empty())
            .collect()
    })
}

/// Iterates all procs in the running DreamDaemon instance, disassembles each,
/// and returns a JSON string matching the frontend's DisassemblyResult schema.
fn do_disassemble() -> String {
    let mut procs = Vec::new();
    let mut i = 0u32;

    while let Some(proc) = Proc::from_id(raw_types::procs::ProcId(i)) {
        i += 1;

        // Skip internal/generated procs and stddef builtins before doing any work
        if proc.path.ends_with("(init)")
            || proc.path == "/dmasm_init"
            || builtin_procs().contains(proc.path.as_str())
        {
            continue;
        }

        let bytecode = unsafe { proc.bytecode().to_vec() };
        if bytecode.is_empty() {
            continue;
        }

        let mut env = DmDisassembleEnv;
        let (nodes, _error) = dmasm::disassembler::disassemble(&bytecode, &mut env);

        let mut instructions = Vec::new();
        let mut current_file: Option<String> = None;
        let mut current_line: Option<u32> = None;

        for node in &nodes {
            if let dmasm::Node::Instruction(ins, dbg) = node {
                // Track debug file/line state
                match ins {
                    dmasm::Instruction::DbgFile(file) => {
                        current_file = String::from_utf8(file.0.clone()).ok();
                    }
                    dmasm::Instruction::DbgLine(line) => {
                        current_line = Some(*line);
                    }
                    _ => {}
                }

                let hex = dbg
                    .bytecode
                    .iter()
                    .map(|b| format!("{b:04x}"))
                    .collect::<Vec<_>>()
                    .join(" ");

                instructions.push(BytecodeInstruction {
                    offset: dbg.offset,
                    hex,
                    text: ins.to_string(),
                    file: current_file.clone(),
                    line: current_line,
                });
            }
        }

        if !instructions.is_empty() {
            // global proc paths: BYOND stores them as "/foo" but DM convention
            // is "/proc/foo" — detect by whether the path has a second slash.
            let display_path = if proc.path.matches('/').count() >= 2 {
                proc.path.clone()
            } else {
                format!("/proc{}", proc.path)
            };
            procs.push(BytecodeProc {
                path: display_path,
                instructions,
            });
        }
    }

    let result = DisassemblyResult { procs };
    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"procs":[]}"#.to_string())
}

fn ffi_return(value: Option<String>) -> *const c_char {
    match value {
        None => &EMPTY_STRING,
        Some(s) if s.is_empty() => &EMPTY_STRING,
        Some(s) => RETURN_STRING.with(|cell| {
            let cstring = CString::new(s).unwrap_or_default();
            cell.replace(cstring);
            cell.borrow().as_ptr()
        }),
    }
}

/// FFI entry point: called from DM via `call_ext("libdm_disasm.so", "disassemble")()`
#[no_mangle]
pub extern "C" fn disassemble(
    _argc: c_int,
    _argv: *const *const c_char,
) -> *const c_char {
    ffi_return(Some(do_disassemble()))
}

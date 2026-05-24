use serde::Serialize;

#[derive(Serialize)]
pub struct BytecodeInstruction {
    pub offset: u32,
    pub hex: String,
    pub text: String,
    pub file: Option<String>,
    pub line: Option<u32>,
}

#[derive(Serialize)]
pub struct BytecodeProc {
    pub path: String,
    pub instructions: Vec<BytecodeInstruction>,
}

#[derive(Serialize)]
pub struct DisassemblyResult {
    pub procs: Vec<BytecodeProc>,
}

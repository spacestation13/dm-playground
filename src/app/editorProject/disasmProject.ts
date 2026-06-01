export const DISASM_SO_NAME = 'libdm_disasm.so'
export const DISASM_LIB_PATH = '/tmp/libdm_disasm.so'

export const DISASM_FILE_NAME = '_disasm.dm'
export const DISASM_DM_CONTENT = `/proc/dmasm_init()
	try
		var/init_res = call_ext("${DISASM_LIB_PATH}", "auxtools_init")()
		world.log << "DISASM_INIT: [init_res]"
		if(init_res == "SUCCESS")
			var/result = call_ext("${DISASM_LIB_PATH}", "disassemble")()
			world.log << "DISASM_RESULT_LEN: [length(result)]"
			world.log << "\\x01DMASM_BEGIN\\x01"
			world.log << result
			world.log << "\\x01DMASM_END\\x01"
		else
			world.log << "\\x01DMASM_ERROR\\x01"
	catch(var/exception/e)
		world.log << "DISASM_EXCEPTION: [e.name]: [e.desc]"
		world.log << "\\x01DMASM_ERROR\\x01"
`

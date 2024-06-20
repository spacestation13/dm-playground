// noinspection JSCommentMatchesSignature

/**
 * The ISA IO bus
 * Devices register their ports here
 *
 * @constructor
 * @param {CPU} cpu
 */

declare class IO {
  /**
   * The ISA IO bus
   * Devices register their ports here
   *
   * @constructor
   * @param {CPU} cpu
   */
  constructor(cpu: CPU);
  /** @const */
  ports: {
    read8: () => number;
    read16: () => number;
    read32: () => number;
    write8: (x: any) => void;
    write16: (x: any) => void;
    write32: (x: any) => void;
    device: any;
  }[];
  /** @const @type {CPU} */
  cpu: CPU;
  create_empty_entry(): {
    read8: () => number;
    read16: () => number;
    read32: () => number;
    write8: (x: any) => void;
    write16: (x: any) => void;
    write32: (x: any) => void;
    device: any;
  };
  empty_port_read8(): number;
  empty_port_read16(): number;
  empty_port_read32(): number;
  empty_port_write(x: any): void;
  /**
   * @param {number} port_addr
   * @param {Object} device
   * @param {function():number=} r8
   * @param {function():number=} r16
   * @param {function():number=} r32
   */
  register_read(
    port_addr: number,
    device: any,
    r8?: (() => number) | undefined,
    r16?: (() => number) | undefined,
    r32?: (() => number) | undefined,
  ): void;
  /**
   * @param {number} port_addr
   * @param {Object} device
   * @param {function(number)=} w8
   * @param {function(number)=} w16
   * @param {function(number)=} w32
   */
  register_write(
    port_addr: number,
    device: any,
    w8?: ((arg0: number) => any) | undefined,
    w16?: ((arg0: number) => any) | undefined,
    w32?: ((arg0: number) => any) | undefined,
  ): void;
  /**
   * > Any two consecutive 8-bit ports can be treated as a 16-bit port;
   * > and four consecutive 8-bit ports can be treated as a 32-bit port
   * > http://css.csail.mit.edu/6.858/2012/readings/i386/s08_01.htm
   *
   * This info is not correct for all ports, but handled by the following functions
   *
   * Register the write of 2 or 4 consecutive 8-bit ports, 1 or 2 16-bit
   * ports and 0 or 1 32-bit ports
   *
   * @param {number} port_addr
   * @param {!Object} device
   * @param {function():number} r8_1
   * @param {function():number} r8_2
   * @param {function():number=} r8_3
   * @param {function():number=} r8_4
   */
  register_read_consecutive(
    port_addr: number,
    device: any,
    r8_1: () => number,
    r8_2: () => number,
    r8_3?: (() => number) | undefined,
    r8_4?: (() => number) | undefined,
    ...args: any[]
  ): void;
  /**
   * @param {number} port_addr
   * @param {!Object} device
   * @param {function(number)} w8_1
   * @param {function(number)} w8_2
   * @param {function(number)=} w8_3
   * @param {function(number)=} w8_4
   */
  register_write_consecutive(
    port_addr: number,
    device: any,
    w8_1: (arg0: number) => any,
    w8_2: (arg0: number) => any,
    w8_3?: ((arg0: number) => any) | undefined,
    w8_4?: ((arg0: number) => any) | undefined,
    ...args: any[]
  ): void;
  mmap_read32_shim(addr: any): number;
  mmap_write32_shim(addr: any, value: any): void;
  /**
   * @param {number} addr
   * @param {number} size
   * @param {*} read_func8
   * @param {*} write_func8
   * @param {*=} read_func32
   * @param {*=} write_func32
   */
  mmap_register(
    addr: number,
    size: number,
    read_func8: any,
    write_func8: any,
    read_func32?: any | undefined,
    write_func32?: any | undefined,
  ): void;
  port_write8(port_addr: any, data: any): any;
  port_write16(port_addr: any, data: any): any;
  port_write32(port_addr: any, data: any): any;
  port_read8(port_addr: any): any;
  port_read16(port_addr: any): any;
  port_read32(port_addr: any): any;
  get_port_description(addr: any): string;
}

declare class CPU {
  /** @constructor */
  new(bus: any, wm: any, next_tick_immediately: any);
  next_tick_immediately: any;
  wm: any;
  wasm_memory: any;
  memory_size: any;
  mem8: Uint8Array;
  mem32s: Int32Array;
  segment_is_null: any;
  segment_offsets: any;
  segment_limits: any;
  /**
   * Wheter or not in protected mode
   */
  protected_mode: any;
  idtr_size: any;
  idtr_offset: any;
  /**
   * global descriptor table register
   */
  gdtr_size: any;
  gdtr_offset: any;
  tss_size_32: any;
  page_fault: any;
  cr: any;
  cpl: any;
  is_32: any;
  stack_size_32: any;
  /**
   * Was the last instruction a hlt?
   */
  in_hlt: any;
  last_virt_eip: any;
  eip_phys: any;
  sysenter_cs: any;
  sysenter_esp: any;
  sysenter_eip: any;
  prefixes: any;
  flags: any;
  /**
   * bitmap of flags which are not updated in the flags variable
   * changed by arithmetic instructions, so only relevant to arithmetic flags
   */
  flags_changed: any;
  /**
   * enough infos about the last arithmetic operation to compute eflags
   */
  last_op1: any;
  last_op_size: any;
  last_result: any;
  current_tsc: any;
  /** @type {!Object} */
  devices: any;
  instruction_pointer: any;
  previous_ip: any;
  apic_enabled: any;
  acpi_enabled: any;
  /** @const */ memory_map_read8: any[];
  /** @const */ memory_map_write8: any[];
  /** @const */ memory_map_read32: any[];
  /** @const */ memory_map_write32: any[];
  /**
   * @const
   * @type {{main: ArrayBuffer, vga: ArrayBuffer}}
   */
  bios: {
    main: ArrayBuffer;
    vga: ArrayBuffer;
  };
  instruction_counter: any;
  reg32: any;
  fpu_st: any;
  fpu_stack_empty: any;
  fpu_stack_ptr: any;
  fpu_control_word: any;
  fpu_status_word: any;
  fpu_ip: any;
  fpu_ip_selector: any;
  fpu_opcode: any;
  fpu_dp: any;
  fpu_dp_selector: any;
  reg_xmm32s: any;
  mxcsr: any;
  sreg: any;
  dreg: any;
  reg_pdpte: any;
  svga_dirty_bitmap_min_offset: any;
  svga_dirty_bitmap_max_offset: any;
  fw_value: any[];
  fw_pointer: number;
  option_roms: any[];
  io: IO;
  bus: any;
  do_many_cycles_count: number;
  do_many_cycles_total: number;
  seen_code: {};
  seen_code_uncompiled: {};
  clear_opstats(): void;
  create_jit_imports(): void;
  jit_imports: any;
  wasm_patch(): void;
  reset_cpu: any;
  getiopl: any;
  get_eflags: any;
  get_eflags_no_arith: any;
  pic_call_irq: any;
  do_many_cycles_native: any;
  cycle_internal: any;
  read8: any;
  read16: any;
  read32s: any;
  write8: any;
  write16: any;
  write32: any;
  in_mapped_range: any;
  fpu_load_tag_word: any;
  fpu_load_status_word: any;
  fpu_get_sti_f64: any;
  translate_address_system_read: any;
  get_seg_cs: any;
  get_real_eip: any;
  clear_tlb: any;
  full_clear_tlb: any;
  set_tsc: any;
  store_current_tsc: any;
  set_cpuid_level: any;
  jit_force_generate_unsafe: any;
  jit_clear_cache: any;
  jit_dirty_cache: any;
  codegen_finalize_finished: any;
  allocate_memory: any;
  zero_memory: any;
  svga_allocate_memory: any;
  svga_allocate_dest_buffer: any;
  svga_fill_pixel_buffer: any;
  svga_mark_dirty: any;
  zstd_create_ctx: any;
  zstd_get_src_ptr: any;
  zstd_free_ctx: any;
  zstd_read: any;
  zstd_read_free: any;
  jit_force_generate(addr: any): void;
  jit_clear_func(index: any): void;
  jit_clear_all_funcs(): void;
  get_state(): any[];
  set_state(state: any): void;
  pack_memory(): {
    bitmap: any;
    packed_memory: Uint8Array;
  };
  unpack_memory(bitmap: any, packed_memory: any): void;
  /**
   * @return {number} time in ms until this method should becalled again
   */
  main_run(): number;
  reboot_internal(): void;
  reset_memory(): void;
  /** @export */
  create_memory(size: any): void;
  init(settings: any, device_bus: any): void;
  load_multiboot(buffer: any): void;
  fill_cmos(rtc: any, settings: any): void;
  load_bios(): void;
  do_many_cycles(): void;
  /** @export */
  cycle(): void;
  codegen_finalize(
    wasm_table_index: any,
    start: any,
    state_flags: any,
    ptr: any,
    len: any,
  ): void;
  log_uncompiled_code(start: any, end: any): void;
  dump_function_code(block_ptr: any, count: any): void;
  hlt_loop(): number;
  run_hardware_timers(now: any): number;
  hlt_op(): void;
  handle_irqs(): void;
  pic_acknowledge(): void;
  device_raise_irq(i: any, ...args: any[]): void;
  device_lower_irq(i: any): void;
}

export interface FileStorageInterface {
  /**
   * Read a portion of a file.
   * @param {string} sha256sum
   * @param {number} offset
   * @param {number} count
   * @return {!Promise<Uint8Array>} null if file does not exist.
   */
  read(sha256sum: string, offset: number, count: number): Promise<Uint8Array>;
  /**
   * Add a read-only file to the filestorage.
   * @param {string} sha256sum
   * @param {!Uint8Array} data
   * @return {!Promise}
   */
  cache(sha256sum: string, data: Uint8Array): Promise<any>;
  /**
   * Call this when the file won't be used soon, e.g. when a file closes or when this immutable
   * version is already out of date. It is used to help prevent accumulation of unused files in
   * memory in the long run for some FileStorage mediums.
   */
  uncache(sha256sum: any): void;
}

/**
 * @constructor
 * @implements {FileStorageInterface}
 */
declare class MemoryFileStorage implements FileStorageInterface {
  /**
   * From sha256sum to file data.
   * @type {Map<string,Uint8Array>}
   */
  filedata: Map<string, Uint8Array>;
  /**
   * @param {string} sha256sum
   * @param {number} offset
   * @param {number} count
   * @return {!Promise<Uint8Array>} null if file does not exist.
   */
  read(sha256sum: string, offset: number, count: number): Promise<Uint8Array>;
  /**
   * @param {string} sha256sum
   * @param {!Uint8Array} data
   */
  cache(sha256sum: string, data: Uint8Array): Promise<void>;
  /**
   * @param {string} sha256sum
   */
  uncache(sha256sum: string): void;
}

/**
 * @constructor
 * @implements {FileStorageInterface}
 */
declare class ServerFileStorageWrapper implements FileStorageInterface {
  /**
   * @constructor
   * @implements {FileStorageInterface}
   * @param {FileStorageInterface} file_storage
   * @param {string} baseurl
   */
  constructor(file_storage: FileStorageInterface, baseurl: string);
  storage: FileStorageInterface;
  baseurl: string;
  /**
   * @param {string} sha256sum
   * @return {!Promise<Uint8Array>}
   */
  load_from_server(sha256sum: string): Promise<Uint8Array>;
  /**
   * @param {string} sha256sum
   * @param {number} offset
   * @param {number} count
   * @return {!Promise<Uint8Array>}
   */
  read(sha256sum: string, offset: number, count: number): Promise<Uint8Array>;
  /**
   * @param {string} sha256sum
   * @param {!Uint8Array} data
   */
  cache(sha256sum: string, data: Uint8Array): Promise<any>;
  /**
   * @param {string} sha256sum
   */
  uncache(sha256sum: string): void;
}

/** @constructor */
declare class BusConnector {
  listeners: {};
  pair: any;
  /**
   * @param {string} name
   * @param {function(?)} fn
   * @param {Object} this_value
   */
  register(name: string, fn: (arg0: unknown) => any, this_value: any): void;
  /**
   * Unregister one message with the given name and callback
   *
   * @param {string} name
   * @param {function(?)} fn
   */
  unregister(name: string, fn: (arg0: unknown) => any): void;
  /**
   * Send ("emit") a message
   *
   * @param {string} name
   * @param {*=} value
   * @param {*=} unused_transfer
   */
  send(
    name: string,
    value?: any | undefined,
    unused_transfer?: any | undefined,
  ): void;
  /**
   * Send a message, guaranteeing that it is received asynchronously
   *
   * @param {string} name
   * @param {Object=} value
   */
  send_async(name: string, value?: any | undefined, ...args: any[]): void;
}

/**
 * @constructor
 *
 * @param {BusConnector} bus
 */
declare class KeyboardAdapter {
  /**
   * @constructor
   *
   * @param {BusConnector} bus
   */
  constructor(bus: BusConnector);
  /**
   * Set by emulator
   * @type {boolean}
   */
  emu_enabled: boolean;
  bus: BusConnector;
  destroy: () => void;
  init: () => void;
  simulate_press: (code: any) => void;
  simulate_char: (chr: any) => void;
}

/**
 * @constructor
 *
 * @param {BusConnector} bus
 */
declare class MouseAdapter {
  /**
   * @constructor
   *
   * @param {BusConnector} bus
   */
  constructor(bus: BusConnector, screen_container: any);
  enabled: boolean;
  emu_enabled: boolean;
  bus: BusConnector;
  is_running: boolean;
  destroy: () => void;
  init: () => void;
}

/**
 * Adapter to use visual screen in browsers (in contrast to node)
 * @constructor
 *
 * @param {BusConnector} bus
 */
declare class ScreenAdapter {
  /**
   * Adapter to use visual screen in browsers (in contrast to node)
   * @constructor
   *
   * @param {BusConnector} bus
   */
  constructor(screen_container: any, bus: BusConnector);
  bus: BusConnector;
  init: () => void;
  make_screenshot: () => void;
  put_char: (
    row: any,
    col: any,
    chr: any,
    bg_color: any,
    fg_color: any,
  ) => void;
  timer: () => void;
  destroy: () => void;
  set_mode: (graphical: any) => void;
  clear_screen: () => void;
  /**
   * @param {number} cols
   * @param {number} rows
   */
  set_size_text: (cols: number, rows: number) => void;
  set_size_graphical: (
    width: any,
    height: any,
    buffer_width: any,
    buffer_height: any,
  ) => void;
  set_scale: (s_x: any, s_y: any) => void;
  update_cursor_scanline: (start: any, end: any) => void;
  update_cursor: (row: any, col: any) => void;
  text_update_row: (row: any) => void;
  update_buffer: (layers: any) => void;
}

/**
 * @constructor
 *
 * @param {BusConnector} bus
 */
declare class DummyScreenAdapter {
  /**
   * @constructor
   *
   * @param {BusConnector} bus
   */
  constructor(bus: BusConnector);
  bus: BusConnector;
  put_char: (
    row: any,
    col: any,
    chr: any,
    bg_color: any,
    fg_color: any,
  ) => void;
  destroy: () => void;
  set_mode: (graphical: any) => void;
  clear_screen: () => void;
  /**
   * @param {number} cols
   * @param {number} rows
   */
  set_size_text: (cols: number, rows: number) => void;
  set_size_graphical: (width: any, height: any) => void;
  set_scale: (s_x: any, s_y: any) => void;
  update_cursor_scanline: (start: any, end: any) => void;
  update_cursor: (row: any, col: any) => void;
  update_buffer: (min: any, max: any) => void;
  get_text_screen: () => string[];
  get_text_row: (i: any) => string;
}

/**
 * @constructor
 *
 * @param {BusConnector} bus
 */
declare class SerialAdapter {
  /**
   * @constructor
   *
   * @param {BusConnector} bus
   */
  constructor(element: any, bus: BusConnector);
  enabled: boolean;
  bus: BusConnector;
  text: string;
  text_new_line: boolean;
  last_update: number;
  destroy: () => void;
  init: () => void;
  /**
   * @type {{(chr: string) => void}}
   */
  show_char: (chr: string) => void;
  /**
   * @type {{() => void}}
   */
  update: () => void;
  /**
   * @type {{() => void}}
   * */
  render: () => void;
  /**
   * @param {number} chr_code
   */
  send_char: (chr_code: number) => void;
}
/**
 * @constructor
 * @param {BusConnector} bus
 */
declare class SerialAdapterXtermJS {
  /**
   * @constructor
   * @param {BusConnector} bus
   */
  constructor(element: any, bus: BusConnector);
  element: any;
  term: any;
  destroy: () => void;
  show(): void;
}

/**
 * @constructor
 * @param {!BusConnector} bus
 */
declare class SpeakerAdapter {
  /**
   * @constructor
   * @param {!BusConnector} bus
   */
  constructor(bus: BusConnector);
  /** @const */
  bus: BusConnector;
  /** @const */
  audio_context: any;
  /** @const */
  mixer: SpeakerMixer;
  /** @const */
  pcspeaker: PCSpeaker;
  /** @const */
  dac: SpeakerWorkletDAC | SpeakerBufferSourceDAC;
  destroy(): void;
}

/**
 * @constructor
 * @param {!BusConnector} bus
 * @param {!AudioContext} audio_context
 */
declare class SpeakerMixer {
  /**
   * @constructor
   * @param {!BusConnector} bus
   * @param {!AudioContext} audio_context
   */
  constructor(bus: BusConnector, audio_context: AudioContext);
  /** @const */
  audio_context: AudioContext;
  sources: any;
  volume_both: number;
  volume_left: number;
  volume_right: number;
  gain_left: number;
  gain_right: number;
  node_treble_left: BiquadFilterNode;
  node_treble_right: BiquadFilterNode;
  node_bass_left: BiquadFilterNode;
  node_bass_right: BiquadFilterNode;
  node_gain_left: GainNode;
  node_gain_right: GainNode;
  node_merger: ChannelMergerNode;
  input_left: BiquadFilterNode;
  input_right: BiquadFilterNode;
  /**
   * @param {!AudioNode} source_node
   * @param {number} source_id
   * @return {SpeakerMixerSource}
   */
  add_source(source_node: AudioNode, source_id: number): SpeakerMixerSource;
  /**
   * @param {number} source_id
   * @param {number=} channel
   */
  connect_source(source_id: number, channel?: number | undefined): void;
  /**
   * @param {number} source_id
   * @param {number=} channel
   */
  disconnect_source(source_id: number, channel?: number | undefined): void;
  /**
   * @param {number} value
   * @param {number=} channel
   */
  set_volume(value: number, channel?: number | undefined): void;
  update(): void;
}
/**
 * @constructor
 * @param {!AudioContext} audio_context
 * @param {!AudioNode} source_node
 * @param {!AudioNode} destination_left
 * @param {!AudioNode} destination_right
 */
declare class SpeakerMixerSource {
  /**
   * @constructor
   * @param {!AudioContext} audio_context
   * @param {!AudioNode} source_node
   * @param {!AudioNode} destination_left
   * @param {!AudioNode} destination_right
   */
  constructor(
    audio_context: AudioContext,
    source_node: AudioNode,
    destination_left: AudioNode,
    destination_right: AudioNode,
  );
  /** @const */
  audio_context: AudioContext;
  connected_left: boolean;
  connected_right: boolean;
  gain_hidden: number;
  volume_both: number;
  volume_left: number;
  volume_right: number;
  node_splitter: ChannelSplitterNode;
  node_gain_left: GainNode;
  node_gain_right: GainNode;
  update(): void;
  /** @param {number=} channel */
  connect(channel?: number | undefined): void;
  /** @param {number=} channel */
  disconnect(channel?: number | undefined): void;
  /**
   * @param {number} value
   * @param {number=} channel
   */
  set_volume(value: number, channel?: number | undefined): void;
  set_gain_hidden(value: any): void;
}
/**
 * @constructor
 * @param {!BusConnector} bus
 * @param {!AudioContext} audio_context
 * @param {!SpeakerMixer} mixer
 */
declare class PCSpeaker {
  /**
   * @constructor
   * @param {!BusConnector} bus
   * @param {!AudioContext} audio_context
   * @param {!SpeakerMixer} mixer
   */
  constructor(
    bus: BusConnector,
    audio_context: AudioContext,
    mixer: SpeakerMixer,
  );
  node_oscillator: OscillatorNode;
  mixer_connection: SpeakerMixerSource;
  start(): void;
}
/**
 * @constructor
 * @param {!BusConnector} bus
 * @param {!AudioContext} audio_context
 * @param {!SpeakerMixer} mixer
 */
declare class SpeakerWorkletDAC {
  /**
   * @constructor
   * @param {!BusConnector} bus
   * @param {!AudioContext} audio_context
   * @param {!SpeakerMixer} mixer
   */
  constructor(
    bus: BusConnector,
    audio_context: AudioContext,
    mixer: SpeakerMixer,
  );
  /** @const */
  bus: BusConnector;
  /** @const */
  audio_context: AudioContext;
  enabled: boolean;
  sampling_rate: number;
  /** @type {AudioWorkletNode} */
  node_processor: AudioWorkletNode;
  node_output: GainNode;
  mixer_connection: SpeakerMixerSource;
  debugger: SpeakerDACDebugger;
  queue(data: any): void;
  pump(): void;
}
/**
 * @constructor
 * @param {!BusConnector} bus
 * @param {!AudioContext} audio_context
 * @param {!SpeakerMixer} mixer
 */
declare class SpeakerBufferSourceDAC {
  /**
   * @constructor
   * @param {!BusConnector} bus
   * @param {!AudioContext} audio_context
   * @param {!SpeakerMixer} mixer
   */
  constructor(
    bus: BusConnector,
    audio_context: AudioContext,
    mixer: SpeakerMixer,
  );
  /** @const */
  bus: BusConnector;
  /** @const */
  audio_context: AudioContext;
  enabled: boolean;
  sampling_rate: number;
  buffered_time: number;
  rate_ratio: number;
  node_lowpass: BiquadFilterNode;
  node_output: BiquadFilterNode;
  mixer_connection: SpeakerMixerSource;
  debugger: SpeakerDACDebugger;
  queue(data: any): void;
  pump(): void;
}
/**
 * @constructor
 */
declare class SpeakerDACDebugger {
  /**
   * @constructor
   */
  constructor(audio_context: any, source_node: any);
  /** @const */
  audio_context: any;
  /** @const */
  node_source: any;
  node_processor: any;
  node_gain: any;
  is_active: boolean;
  queued_history: any[];
  output_history: any[];
  queued: any[][];
  output: any[][];
  /** @suppress {deprecated} */
  start(duration_ms: any): void;
  stop(): void;
  push_queued_data(data: any): void;
  download_txt(history_id: any, channel: any): void;
  download_csv(history_id: any): void;
}

declare class FS {
  /**
   * @constructor
   * @param {!FileStorageInterface} storage
   * @param {{ last_qidnumber: number }=} qidcounter Another fs's qidcounter to synchronise with.
   */
  constructor(
    storage: FileStorageInterface,
    qidcounter?:
      | {
          last_qidnumber: number;
        }
      | undefined,
  );
  /** @type {Array.<!Inode>} */
  inodes: Array<Inode>;
  events: any[];
  storage: FileStorageInterface;
  qidcounter: {
    last_qidnumber: number;
  };
  inodedata: {};
  total_size: number;
  used_size: number;
  /** @type {!Array<!FSMountInfo>} */
  mounts: Array<FSMountInfo>;
  get_state(): (number | Inode[])[];
  set_state(state: any): void;
  AddEvent(id: any, OnEvent: any): void;
  HandleEvent(id: any): void;
  load_from_json(fs: any, done: any): void;
  LoadRecursive(data: any, parentid: any): void;
  LoadDir(parentid: any, children: any): void;
  private should_be_linked;
  private link_under_dir;
  private unlink_from_dir;
  PushInode(inode: any, parentid: any, name: any): void;
  private divert;
  private copy_inode;
  CreateInode(): Inode;
  CreateDirectory(name: any, parentid: any): any;
  CreateFile(filename: any, parentid: any): any;
  CreateNode(filename: any, parentid: any, major: any, minor: any): any;
  CreateSymlink(filename: any, parentid: any, symlink: any): any;
  CreateTextFile(filename: any, parentid: any, str: any): any;
  /**
   * @param {Uint8Array} buffer
   */
  CreateBinaryFile(filename: any, parentid: any, buffer: Uint8Array): any;
  OpenInode(id: any, mode: any): any;
  CloseInode(id: any): any;
  /**
   * @return {!Promise<number>} 0 if success, or -errno if failured.
   */
  Rename(
    olddirid: any,
    oldname: any,
    newdirid: any,
    newname: any,
  ): Promise<number>;
  Write(id: any, offset: any, count: any, buffer: any): Promise<void>;
  Read(inodeid: any, offset: any, count: any): any;
  Search(parentid: any, name: any): any;
  CountUsedInodes(): number;
  CountFreeInodes(): number;
  GetTotalSize(): number;
  GetSpace(): number;
  /**
   * XXX: Not ideal.
   * @param {number} idx
   * @return {string}
   */
  GetDirectoryName(idx: number): string;
  GetFullPath(idx: any): string;
  /**
   * @param {number} parentid
   * @param {number} targetid
   * @param {string} name
   * @return {number} 0 if success, or -errno if failured.
   */
  Link(parentid: number, targetid: number, name: string): number;
  Unlink(parentid: any, name: any): any;
  DeleteData(idx: any): Promise<void>;
  private get_buffer;
  private get_data;
  private set_data;
  /**
   * @param {number} idx
   * @return {!Inode}
   */
  GetInode(idx: number): Inode;
  ChangeSize(idx: any, newsize: any): Promise<void>;
  SearchPath(path: any): {
    id: number;
    parentid: number;
    name: any;
    forward_path: string;
  };
  /**
   * @param {number} dirid
   * @param {Array<{parentid: number, name: string}>} list
   */
  GetRecursiveList(
    dirid: number,
    list: Array<{
      parentid: number;
      name: string;
    }>,
  ): void;
  RecursiveDelete(path: any): void;
  DeleteNode(path: any): void;
  /** @param {*=} info */
  NotifyListeners(id: any, action: any, info?: any | undefined): void;
  Check(): void;
  FillDirectory(dirid: any): void;
  RoundToDirentry(dirid: any, offset_target: any): any;
  /**
   * @param {number} idx
   * @return {boolean}
   */
  IsDirectory(idx: number): boolean;
  /**
   * @param {number} idx
   * @return {boolean}
   */
  IsEmpty(idx: number): boolean;
  /**
   * @param {number} idx
   * @return {!Array<string>} List of children names
   */
  GetChildren(idx: number): Array<string>;
  /**
   * @param {number} idx
   * @return {number} Local idx of parent
   */
  GetParent(idx: number): number;
  PrepareCAPs(id: any): any;
  private set_forwarder;
  private create_forwarder;
  private is_forwarder;
  private is_a_root;
  private get_forwarder;
  private delete_forwarder;
  private follow_fs;
  /**
   * Mount another filesystem to given path.
   * @param {string} path
   * @param {FS} fs
   * @return {number} inode id of mount point if successful, or -errno if mounting failed.
   */
  Mount(path: string, fs: FS): number;
  /**
   * @param {number} type
   * @param {number} start
   * @param {number} length
   * @param {number} proc_id
   * @param {string} client_id
   * @return {!FSLockRegion}
   */
  DescribeLock(
    type: number,
    start: number,
    length: number,
    proc_id: number,
    client_id: string,
  ): FSLockRegion;
  /**
   * @param {number} id
   * @param {FSLockRegion} request
   * @return {FSLockRegion} The first conflicting lock found, or null if requested lock is possible.
   */
  GetLock(id: number, request: FSLockRegion): FSLockRegion;
  /**
   * @param {number} id
   * @param {FSLockRegion} request
   * @param {number} flags
   * @return {number} One of P9_LOCK_SUCCESS / P9_LOCK_BLOCKED / P9_LOCK_ERROR / P9_LOCK_GRACE.
   */
  Lock(id: number, request: FSLockRegion, flags: number): number;
  read_dir(path: any): any;
  read_file(file: any): any;
}

/** @constructor */
declare class Inode {
  /** @constructor */
  constructor(qidnumber: any);
  direntries: any;
  status: number;
  size: number;
  uid: number;
  gid: number;
  fid: number;
  ctime: number;
  atime: number;
  mtime: number;
  major: number;
  minor: number;
  symlink: string;
  mode: number;
  qid: {
    type: number;
    version: number;
    path: any;
  };
  caps: any;
  nlinks: number;
  sha256sum: string;
  /** @type{!Array<!FSLockRegion>} */
  locks: Array<FSLockRegion>;
  mount_id: number;
  foreign_id: number;
  get_state(): any[];
  set_state(state: any): void;
}
/**
 * @constructor
 * @param {FS} filesystem
 */
declare class FSMountInfo {
  /**
   * @constructor
   * @param {FS} filesystem
   */
  constructor(filesystem: FS);
  /** @type {FS}*/
  fs: FS;
  /**
   * Maps foreign inode id back to local inode id.
   * @type {!Map<number,number>}
   */
  backtrack: Map<number, number>;
  get_state(): (FS | Map<number, number>[])[];
  set_state(state: any): void;
}
/**
 * @constructor
 */
declare class FSLockRegion {
  type: number;
  start: number;
  length: number;
  proc_id: number;
  client_id: string;
  get_state(): (string | number)[];
  set_state(state: any): void;
  /**
   * @return {FSLockRegion}
   */
  clone(): FSLockRegion;
  /**
   * @param {FSLockRegion} region
   * @return {boolean}
   */
  conflicts_with(region: FSLockRegion): boolean;
  /**
   * @param {FSLockRegion} region
   * @return {boolean}
   */
  is_alike(region: FSLockRegion): boolean;
  /**
   * @param {FSLockRegion} region
   * @return {boolean}
   */
  may_merge_after(region: FSLockRegion): boolean;
}

/**
 * Constructor for emulator instances.
 *
 * Usage: `var emulator = new V86Starter(options);`
 *
 * Options can have the following properties (all optional, default in parenthesis):
 *
 * - `memory_size number` (16 * 1024 * 1024) - The memory size in bytes, should
 *   be a power of 2.
 * - `vga_memory_size number` (8 * 1024 * 1024) - VGA memory size in bytes.
 *
 * - `autostart boolean` (false) - If emulation should be started when emulator
 *   is ready.
 *
 * - `disable_keyboard boolean` (false) - If the keyboard should be disabled.
 * - `disable_mouse boolean` (false) - If the mouse should be disabled.
 *
 * - `network_relay_url string` (No network card) - The url of a server running
 *   websockproxy. See [networking.md](networking.md). Setting this will
 *   enable an emulated network card.
 *
 * - `bios Object` (No bios) - Either a url pointing to a bios or an
 *   ArrayBuffer, see below.
 * - `vga_bios Object` (No VGA bios) - VGA bios, see below.
 * - `hda Object` (No hard drive) - First hard disk, see below.
 * - `fda Object` (No floppy disk) - First floppy disk, see below.
 * - `cdrom Object` (No CD) - See below.
 *
 * - `bzimage Object` - A Linux kernel image to boot (only bzimage format), see below.
 * - `initrd Object` - A Linux ramdisk image, see below.
 * - `bzimage_initrd_from_filesystem boolean` - Automatically fetch bzimage and
 *    initrd from the specified `filesystem`.
 *
 * - `initial_state Object` (Normal boot) - An initial state to load, see
 *   [`restore_state`](#restore_statearraybuffer-state) and below.
 *
 * - `filesystem Object` (No 9p filesystem) - A 9p filesystem, see
 *   [filesystem.md](filesystem.md).
 *
 * - `serial_container HTMLTextAreaElement` (No serial terminal) - A textarea
 *   that will receive and send data to the emulated serial terminal.
 *   Alternatively the serial terminal can also be accessed programatically,
 *   see [serial.html](../examples/serial.html).
 *
 * - `screen_container HTMLElement` (No screen) - An HTMLElement. This should
 *   have a certain structure, see [basic.html](../examples/basic.html).
 *
 * ***
 *
 * There are two ways to load images (`bios`, `vga_bios`, `cdrom`, `hda`, ...):
 *
 * - Pass an object that has a url. Optionally, `async: true` and `size:
 *   size_in_bytes` can be added to the object, so that sectors of the image
 *   are loaded on demand instead of being loaded before boot (slower, but
 *   strongly recommended for big files). In that case, the `Range: bytes=...`
 *   header must be supported on the server.
 *
 *   ```javascript
 *   // download file before boot
 *   bios: {
 *       url: "bios/seabios.bin"
 *   }
 *   // download file sectors as requested, size is required
 *   hda: {
 *       url: "disk/linux.iso",
 *       async: true,
 *       size: 16 * 1024 * 1024
 *   }
 *   ```
 *
 * - Pass an `ArrayBuffer` or `File` object as `buffer` property.
 *
 *   ```javascript
 *   // use <input type=file>
 *   bios: {
 *       buffer: document.all.hd_image.files[0]
 *   }
 *   // start with empty hard drive
 *   hda: {
 *       buffer: new ArrayBuffer(16 * 1024 * 1024)
 *   }
 *   ```
 *
 * ***
 *
 * @param {Object} options Options to initialize the emulator with.
 * @constructor
 */
declare class V86Starter {
  /**
   * Constructor for emulator instances.
   *
   * Usage: `var emulator = new V86Starter(options);`
   *
   * Options can have the following properties (all optional, default in parenthesis):
   *
   * - `memory_size number` (16 * 1024 * 1024) - The memory size in bytes, should
   *   be a power of 2.
   * - `vga_memory_size number` (8 * 1024 * 1024) - VGA memory size in bytes.
   *
   * - `autostart boolean` (false) - If emulation should be started when emulator
   *   is ready.
   *
   * - `disable_keyboard boolean` (false) - If the keyboard should be disabled.
   * - `disable_mouse boolean` (false) - If the mouse should be disabled.
   *
   * - `network_relay_url string` (No network card) - The url of a server running
   *   websockproxy. See [networking.md](networking.md). Setting this will
   *   enable an emulated network card.
   *
   * - `bios Object` (No bios) - Either a url pointing to a bios or an
   *   ArrayBuffer, see below.
   * - `vga_bios Object` (No VGA bios) - VGA bios, see below.
   * - `hda Object` (No hard drive) - First hard disk, see below.
   * - `fda Object` (No floppy disk) - First floppy disk, see below.
   * - `cdrom Object` (No CD) - See below.
   *
   * - `bzimage Object` - A Linux kernel image to boot (only bzimage format), see below.
   * - `initrd Object` - A Linux ramdisk image, see below.
   * - `bzimage_initrd_from_filesystem boolean` - Automatically fetch bzimage and
   *    initrd from the specified `filesystem`.
   *
   * - `initial_state Object` (Normal boot) - An initial state to load, see
   *   [`restore_state`](#restore_statearraybuffer-state) and below.
   *
   * - `filesystem Object` (No 9p filesystem) - A 9p filesystem, see
   *   [filesystem.md](filesystem.md).
   *
   * - `serial_container HTMLTextAreaElement` (No serial terminal) - A textarea
   *   that will receive and send data to the emulated serial terminal.
   *   Alternatively the serial terminal can also be accessed programatically,
   *   see [serial.html](../examples/serial.html).
   *
   * - `screen_container HTMLElement` (No screen) - An HTMLElement. This should
   *   have a certain structure, see [basic.html](../examples/basic.html).
   *
   * ***
   *
   * There are two ways to load images (`bios`, `vga_bios`, `cdrom`, `hda`, ...):
   *
   * - Pass an object that has a url. Optionally, `async: true` and `size:
   *   size_in_bytes` can be added to the object, so that sectors of the image
   *   are loaded on demand instead of being loaded before boot (slower, but
   *   strongly recommended for big files). In that case, the `Range: bytes=...`
   *   header must be supported on the server.
   *
   *   ```javascript
   *   // download file before boot
   *   bios: {
   *       url: "bios/seabios.bin"
   *   }
   *   // download file sectors as requested, size is required
   *   hda: {
   *       url: "disk/linux.iso",
   *       async: true,
   *       size: 16 * 1024 * 1024
   *   }
   *   ```
   *
   * - Pass an `ArrayBuffer` or `File` object as `buffer` property.
   *
   *   ```javascript
   *   // use <input type=file>
   *   bios: {
   *       buffer: document.all.hd_image.files[0]
   *   }
   *   // start with empty hard drive
   *   hda: {
   *       buffer: new ArrayBuffer(16 * 1024 * 1024)
   *   }
   *   ```
   *
   * ***
   *
   * @param {Object} options Options to initialize the emulator with.
   * @constructor
   */
  constructor(options: any);
  cpu_is_running: boolean;
  bus: BusConnector;
  emulator_bus: BusConnector;
  v86: any;
  continue_init(emulator: any, options: any): Promise<void>;
  disk_images: {
    fda: any;
    fdb: any;
    hda: any;
    hdb: any;
    cdrom: any;
  };
  network_adapter: any;
  keyboard_adapter: KeyboardAdapter;
  mouse_adapter: MouseAdapter;
  screen_adapter: ScreenAdapter | DummyScreenAdapter;
  serial_adapter: SerialAdapter | SerialAdapterXtermJS;
  speaker_adapter: SpeakerAdapter;
  fs9p: FS;
  get_bzimage_initrd_from_filesystem(filesystem: any): {
    initrd_path: any;
    bzimage_path: any;
  };
  /**
   * Start emulation. Do nothing if emulator is running already. Can be
   * asynchronous.
   * @export
   */
  run(): Promise<void>;
  /**
   * Stop emulation. Do nothing if emulator is not running. Can be asynchronous.
   * @export
   */
  stop(): Promise<void>;
  /**
   * @ignore
   * @export
   */
  destroy(): Promise<void>;
  /**
   * Restart (force a reboot).
   * @export
   */
  restart(): void;
  /**
   * Add an event listener (the emulator is an event emitter). A list of events
   * can be found at [events.md](events.md).
   *
   * The callback function gets a single argument which depends on the event.
   *
   * @param {string} event Name of the event.
   * @param {function(*)} listener The callback function.
   * @export
   */
  add_listener(event: string, listener: (arg0: any) => any): void;
  /**
   * Remove an event listener.
   *
   * @param {string} event
   * @param {function(*)} listener
   * @export
   */
  remove_listener(event: string, listener: (arg0: any) => any): void;
  /**
   * Restore the emulator state from the given state, which must be an
   * ArrayBuffer returned by
   * [`save_state`](#save_statefunctionobject-arraybuffer-callback).
   *
   * Note that the state can only be restored correctly if this constructor has
   * been created with the same options as the original instance (e.g., same disk
   * images, memory size, etc.).
   *
   * Different versions of the emulator might use a different format for the
   * state buffer.
   *
   * @param {ArrayBuffer} state
   * @export
   */
  restore_state(state: ArrayBuffer, ...args: any[]): Promise<void>;
  /**
   * Asynchronously save the current state of the emulator.
   *
   * @return {Promise<ArrayBuffer>}
   * @export
   */
  save_state(...args: any[]): Promise<ArrayBuffer>;
  /**
   * Return an object with several statistics. Return value looks similar to
   * (but can be subject to change in future versions or different
   * configurations, so use defensively):
   *
   * ```javascript
   * {
   *     "cpu": {
   *         "instruction_counter": 2821610069
   *     },
   *     "hda": {
   *         "sectors_read": 95240,
   *         "sectors_written": 952,
   *         "bytes_read": 48762880,
   *         "bytes_written": 487424,
   *         "loading": false
   *     },
   *     "cdrom": {
   *         "sectors_read": 0,
   *         "sectors_written": 0,
   *         "bytes_read": 0,
   *         "bytes_written": 0,
   *         "loading": false
   *     },
   *     "mouse": {
   *         "enabled": true
   *     },
   *     "vga": {
   *         "is_graphical": true,
   *         "res_x": 800,
   *         "res_y": 600,
   *         "bpp": 32
   *     }
   * }
   * ```
   *
   * @deprecated
   * @return {Object}
   * @export
   */
  get_statistics(): any;
  /**
   * @return {number}
   * @ignore
   * @export
   */
  get_instruction_counter(): number;
  /**
   * @return {boolean}
   * @export
   */
  is_running(): boolean;
  /**
   * Send a sequence of scan codes to the emulated PS2 controller. A list of
   * codes can be found at http://stanislavs.org/helppc/make_codes.html.
   * Do nothing if there is no keyboard controller.
   *
   * @param {Array.<number>} codes
   * @export
   */
  keyboard_send_scancodes(codes: Array<number>): void;
  /**
   * Send translated keys
   * @ignore
   * @export
   */
  keyboard_send_keys(codes: any): void;
  /**
   * Send text
   * @ignore
   * @export
   */
  keyboard_send_text(string: any): void;
  /**
   * Download a screenshot.
   *
   * @ignore
   * @export
   */
  screen_make_screenshot(): void;
  /**
   * Set the scaling level of the emulated screen.
   *
   * @param {number} sx
   * @param {number} sy
   *
   * @ignore
   * @export
   */
  screen_set_scale(sx: number, sy: number): void;
  /**
   * Go fullscreen.
   *
   * @ignore
   * @export
   */
  screen_go_fullscreen(): void;
  /**
   * Lock the mouse cursor: It becomes invisble and is not moved out of the
   * browser window.
   *
   * @ignore
   * @export
   */
  lock_mouse(): void;
  /**
   * Enable or disable sending mouse events to the emulated PS2 controller.
   *
   * @param {boolean} enabled
   */
  mouse_set_status(enabled: boolean): void;
  /**
   * Enable or disable sending keyboard events to the emulated PS2 controller.
   *
   * @param {boolean} enabled
   * @export
   */
  keyboard_set_status(enabled: boolean): void;
  /**
   * Send a string to the first emulated serial terminal.
   *
   * @param {string} data
   * @export
   */
  serial0_send(data: string): void;
  /**
   * Send bytes to a serial port (to be received by the emulated PC).
   *
   * @param {Uint8Array} data
   * @export
   */
  serial_send_bytes(serial: any, data: Uint8Array): void;
  /**
   * Mount another filesystem to the current filesystem.
   * @param {string} path Path for the mount point
   * @param {string|undefined} baseurl
   * @param {string|undefined} basefs As a JSON string
   * @param {function(Object)=} callback
   * @export
   */
  mount_fs(
    path: string,
    baseurl: string | undefined,
    basefs: string | undefined,
    callback?: ((arg0: any) => any) | undefined,
  ): Promise<void>;
  /**
   * Write to a file in the 9p filesystem. Nothing happens if no filesystem has
   * been initialized.
   *
   * @param {string} file
   * @param {Uint8Array} data
   * @export
   */
  create_file(file: string, data: Uint8Array, ...args: any[]): Promise<any>;
  /**
   * Read a file in the 9p filesystem. Nothing happens if no filesystem has been
   * initialized.
   *
   * @param {string} file
   * @export
   */
  read_file(file: string, ...args: any[]): Promise<any>;
  automatically(steps: any): void;
  /**
   * Reads data from memory at specified offset.
   *
   * @param {number} offset
   * @param {number} length
   * @returns
   */
  read_memory(offset: number, length: number): any;
  /**
   * Writes data to memory at specified offset.
   *
   * @param {Array.<number>|Uint8Array} blob
   * @param {number} offset
   */
  write_memory(blob: Array<number> | Uint8Array, offset: number): void;
}

export namespace print_stats {
  function stats_to_string(cpu: CPU): string;
  function print_misc_stats(cpu: CPU): string;
  function print_instruction_counts(cpu: CPU): string;
  function print_instruction_counts_offset(
    cpu: CPU,
    compiled: any,
    jit_exit: any,
    unguarded_register: any,
    wasm_size: any,
  ): string;
}

declare type _CPU = CPU;
declare type _MemoryFileStorage = typeof MemoryFileStorage;
declare type _ServerFileStorageWrapper = typeof ServerFileStorageWrapper;
declare type _print_stats = typeof print_stats;
declare type _V86Starter = typeof V86Starter;

declare global {
  declare const CPU: _CPU;
  declare const MemoryFileStorage: _MemoryFileStorageClass;
  declare const ServerFileStorageWrapper: _ServerFileStorageWrapperClass;
  declare const print_stats: _print_stats;
  declare const V86Starter: _V86Starter;
  declare const V86: _V86Starter;

  interface Window {
    CPU: typeof CPU;
    MemoryFileStorage: typeof MemoryFileStorage;
    ServerFileStorageWrapper: typeof ServerFileStorageWrapper;
    print_stats: typeof print_stats;
    V86Starter: typeof V86Starter;
    V86: typeof V86Starter;
  }
}

export declare type CPUType = _CPU;
export declare type MemoryFileStorageType = _MemoryFileStorage;
export declare type ServerFileStorageWrapperType = _ServerFileStorageWrapper;
export declare type V86StarterType = _V86Starter;
export declare type V86Type = _V86Starter;

export {};

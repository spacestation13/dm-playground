import { emulator } from "./emulator";

let last_instr_counter;
let last_tick;
let update_speed_interval;

function update_speed() {
  const now = Date.now();

  const instruction_counter = emulator.get_instruction_counter();

  if (instruction_counter < last_instr_counter) {
    // 32-bit wrap-around
    last_instr_counter -= 0x100000000;
  }

  const last_ips = instruction_counter - last_instr_counter;
  last_instr_counter = instruction_counter;

  const delta_time = now - last_tick;
  last_tick = now;

  const speed = last_ips / 1000 / delta_time;
  if (Number.isNaN(speed)) {
    document.getElementById("speed").textContent = "N/A";
  } else {
    document.getElementById("speed").textContent = speed.toFixed(1) + "mIPS";
  }
}

emulator.add_listener("emulator-started", () => {
  update_speed_interval = setInterval(update_speed, 1000);
});
emulator.add_listener("emulator-stopped", () => {
  clearInterval(update_speed_interval);
});

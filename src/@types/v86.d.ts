import { V86Starter as _V86Starter } from "../scripts/lib/libv86";

declare global {
  type V86Starter = _V86Starter;
  declare const V86Starter = _V86Starter;
}

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NostrEvent } from "@snort/system";

interface ReBroadcastStore {
  show: boolean;
  selectedCustomRelays: false | Array<string>;
  note?: NostrEvent;
}

const InitState: ReBroadcastStore = {
  show: false,
  selectedCustomRelays: false,
};

const ReBroadcastSlice = createSlice({
  name: "ReBroadcast",
  initialState: InitState,
  reducers: {
    setShow: (state, action: PayloadAction<boolean>) => {
      state.show = action.payload;
    },
    setNote: (state, action: PayloadAction<NostrEvent>) => {
      state.note = action.payload;
    },
    setSelectedCustomRelays: (state, action: PayloadAction<false | Array<string>>) => {
      state.selectedCustomRelays = action.payload;
    },
    reset: () => InitState,
  },
});

export const { setShow, setNote, setSelectedCustomRelays, reset } = ReBroadcastSlice.actions;

export const reducer = ReBroadcastSlice.reducer;

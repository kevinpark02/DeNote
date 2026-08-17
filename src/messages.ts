import { DropdownId } from "./components/Dropdown";

export type StartListenMessage = {
    type: 'START_LISTEN'
    instrument: DropdownId
    url: string
    fromSeconds: number
    toSeconds: number
}

export type CaptureStreamMessage = {
    type: 'CAPTURE_STREAM'
    streamId: string
}

export type StopCaptureMessage = {
    type: 'STOP_CAPTURE'
}

export type PlaybackEndedMessage = {
    type: 'PLAYBACK_ENDED'
}

export type ExtensionMessage =
    | StartListenMessage
    | CaptureStreamMessage
    | StopCaptureMessage
    | PlaybackEndedMessage
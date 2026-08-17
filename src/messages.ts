import type { DropdownId } from "./components/Dropdown";

export const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/

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
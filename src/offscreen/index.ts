import { ExtensionMessage } from '../messages'

interface ChromeTabCaptureConstraints extends MediaTrackConstraints {
    mandatory: {
        chromeMediaSource: 'tab'
        chromeMediaSourceId: string
    }
}

let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'CAPTURE_STREAM') {
        startCapture(message.streamId).catch((error) => {
            console.error('DeNote: startCapture failed', error)
        })
    }
    if (message.type === 'STOP_CAPTURE' || message.type === 'PLAYBACK_ENDED') {
        stopCapture()
    }
})

const startCapture = async (streamId: string): Promise<void> => {
    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
            },
        } as ChromeTabCaptureConstraints,
        video: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
            },
        } as ChromeTabCaptureConstraints,
    })

    mediaStream.getVideoTracks().forEach((track) => track.stop())

    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(mediaStream)
    source.connect(audioContext.destination)

    const audioOnlyStream = new MediaStream(mediaStream.getAudioTracks())
    recordedChunks = []
    recorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' })

    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data)
        }
    }

    recorder.start()
}

const stopCapture = (): void => {
    if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' })
            chrome.runtime.sendMessage({ type: 'RECORDING_COMPLETE', size: blob.size }).catch(() => {})
            window.close()
        }
        recorder.stop()
    }

    mediaStream?.getTracks().forEach((track) => track.stop())
    audioContext?.close()
    mediaStream = null
    audioContext = null
    recorder = null
}


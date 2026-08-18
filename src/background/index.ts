import { ExtensionMessage, YOUTUBE_URL_PATTERN } from "../messages"

let session: { tabId: number } | null = null

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'START_LISTEN') {
        handleStartListen(message)
    }
    if (message.type === 'PLAYBACK_ENDED') {
        handlePlaybackEnded()
    }
    if (message.type === 'RECORDING_COMPLETE') {
        console.log('DeNote: recording complete', message.size, 'bytes')
    }
})

const seekAndPlay = (from: number, to: number): void => {
    const video = document.querySelector('video')
    if (!video) return

    video.currentTime = from
    video.play().catch((error) => {
        console.error('DeNote: failed to play video', error)
    })

    const onTimeUpdate = () => {
        if (video.currentTime >= to) {
            video.removeEventListener('timeupdate', onTimeUpdate)
            video.pause()
            chrome.runtime.sendMessage({ type: 'PLAYBACK_ENDED' }).catch(() => {})
        }
    }

    video.addEventListener('timeupdate', onTimeUpdate)
}

const resetCapture = async (): Promise<void> => {
    if (await chrome.offscreen.hasDocument()) {
        chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }).catch(() => {})
        await chrome.offscreen.closeDocument()
    }
    session = null
}

const handleStartListen = async (message: Extract<ExtensionMessage, { type: 'START_LISTEN' }>): Promise<void> => {
    await resetCapture()

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab.id || !tab.url || !YOUTUBE_URL_PATTERN.test(tab.url)) {
        console.error('DeNote: the active tab is not a YouTube video. Open the video first, then click Listen.')
        return
    }

    session = { tabId: tab.id }

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: seekAndPlay,
        args: [message.fromSeconds, message.toSeconds],
    })

    const hasOffscreenDocument = await chrome.offscreen.hasDocument()

    if (!hasOffscreenDocument) {
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('src/offscreen/index.html'),
            reasons: [chrome.offscreen.Reason.USER_MEDIA],
            justification: 'Capture tab audio to analyze the notes being played',
        })
    }

    const streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
            if (chrome.runtime.lastError || !streamId) {
                reject(chrome.runtime.lastError ?? new Error('Failed to get media stream id'))
                return
            }
            resolve(streamId)
        })
    })
    chrome.runtime.sendMessage({ type: 'CAPTURE_STREAM', streamId }).catch(() => {})
}

const handlePlaybackEnded = (): void => {
    session = null
}

chrome.tabs.onRemoved.addListener((tabId) => {
    if (session?.tabId === tabId) {
        resetCapture()
    }
})
import { ChangeEvent, FocusEvent, useState } from 'react'
import './Dropdown.css'

type InputUrlProps = {
    url: string
    onChange: (url: string) => void
}

const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/

const InputUrl = ({ url, onChange }: InputUrlProps) => {
    const [urlInvalid, setUrlInvalid] = useState(false)

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.value)
    }

    const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
        setUrlInvalid(event.target.value !== '' && !YOUTUBE_URL_PATTERN.test(event.target.value))
    }

    return (
        <label className="field">
            <span className="field-label">YouTube URL</span>
            <input
                type="text"
                className={`field-select${urlInvalid ? ' field-select-invalid' : ''}`}
                placeholder="Paste a YouTube video URL"
                value={url}
                onChange={handleChange}
                onBlur={handleBlur}
            />
            {urlInvalid && <p className="field-error">Enter a valid YouTube URL.</p>}
        </label>
    )
}

export default InputUrl
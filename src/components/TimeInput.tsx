import { ChangeEvent, FocusEvent, useState } from 'react'
import './Dropdown.css'

type TimeInputProps = {
    from: string
    to: string
    onFromChange: (value: string) => void
    onToChange: (value: string) => void
}

// Allows partial input while typing, e.g. "1", "12:", "12:3"
const PARTIAL_TIME_PATTERN = /^\d{0,2}(:\d{0,2})?$/
// A fully valid MM:SS value, e.g. "1:05", "12:59"
const FULL_TIME_PATTERN = /^\d{1,2}:[0-5]\d$/

// Converts a valid MM:SS string to total seconds, or null if it isn't one yet
const parseTime = (value: string): number | null => {
    if (!FULL_TIME_PATTERN.test(value)) return null
    const [minutes, seconds] = value.split(':').map(Number)
    return minutes * 60 + seconds
}

const TimeInput = ({ from, to, onFromChange, onToChange }: TimeInputProps) => {
    const [fromInvalid, setFromInvalid] = useState(false)
    const [toInvalid, setToInvalid] = useState(false)

    const fromSeconds = parseTime(from)
    const toSeconds = parseTime(to)
    const rangeInvalid = fromSeconds !== null && toSeconds !== null && fromSeconds > toSeconds

    const handleFromChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value
        if (PARTIAL_TIME_PATTERN.test(value)) {
            onFromChange(value)
        }
    }

    const handleToChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value
        if (PARTIAL_TIME_PATTERN.test(value)) {
            onToChange(value)
        }
    }

    const handleFromBlur = (event: FocusEvent<HTMLInputElement>): void => {
        setFromInvalid(event.target.value !== '' && !FULL_TIME_PATTERN.test(event.target.value))
    }

    const handleToBlur = (event: FocusEvent<HTMLInputElement>): void => {
        setToInvalid(event.target.value !== '' && !FULL_TIME_PATTERN.test(event.target.value))
    }

    return (
        <div className="field">
            <span className="field-label">Timestamp</span>
            <div className="time-range">
                <input
                    type="text"
                    className={`field-select time-range-input${(fromInvalid || rangeInvalid) ? ' field-select-invalid' : ''}`}
                    placeholder="0:00"
                    maxLength={5}
                    value={from}
                    onChange={handleFromChange}
                    onBlur={handleFromBlur}
                />
                <span className="time-range-separator">to</span>
                <input
                    type="text"
                    className={`field-select time-range-input${(toInvalid || rangeInvalid) ? ' field-select-invalid' : ''}`}
                    placeholder="0:00"
                    maxLength={5}
                    value={to}
                    onChange={handleToChange}
                    onBlur={handleToBlur}
                />
            </div>
            {rangeInvalid && <p className="time-range-error">"From" can't be later than "To".</p>}
        </div>
    )
}

export default TimeInput

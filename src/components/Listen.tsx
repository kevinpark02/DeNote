import { useState } from 'react'
import Dropdown, { DropdownId } from './Dropdown'
import InputUrl from './InputUrl'
import TimeInput, { FULL_TIME_PATTERN, parseTime } from './TimeInput'
import { StartListenMessage, YOUTUBE_URL_PATTERN } from '../messages'
import Button from './Button'

import './Listen.css'

const Listen = () => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | undefined>(undefined)
  const [url, setUrl] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const isDropdownValid = activeDropdown !== undefined
  const isUrlValid = YOUTUBE_URL_PATTERN.test(url)
  const isFromValid = FULL_TIME_PATTERN.test(from)
  const isToValid = FULL_TIME_PATTERN.test(to)
  const isRangeValid = isFromValid && isToValid && (parseTime(from) as number) < (parseTime(to) as number)
  const isFormValid = isDropdownValid && isUrlValid && isFromValid && isToValid && isRangeValid

  const handleListenClick = (): void => {
    if (!isFormValid || !activeDropdown) return

    const message: StartListenMessage = {
      type: 'START_LISTEN',
      instrument: activeDropdown,
      url,
      fromSeconds: parseTime(from) as number,
      toSeconds: parseTime(to) as number,
    }

    chrome.runtime.sendMessage(message).catch(console.error)
  }

  
  return (
    <div className="listen">
      <Dropdown activeDropdown={activeDropdown} onChange={setActiveDropdown} />
      <InputUrl url={url} onChange={setUrl} />
      <TimeInput from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      <Button disabled={!isFormValid} onClick={handleListenClick}/>
    </div>
  )
}

export default Listen
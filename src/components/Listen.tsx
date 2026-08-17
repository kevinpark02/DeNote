import { useState } from 'react'
import Dropdown, { DropdownId } from './Dropdown'
import InputUrl from './InputUrl'
import TimeInput from './TimeInput'
import './Listen.css'

const Listen = () => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | undefined>(undefined)
  const [url, setUrl] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  return (
    <div className="listen">
      <Dropdown activeDropdown={activeDropdown} onChange={setActiveDropdown} />
      <InputUrl url={url} onChange={setUrl} />
      <TimeInput from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
    </div>
  )
}

export default Listen
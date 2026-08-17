import { useState } from 'react'
import Dropdown, { DropdownId } from './Dropdown'
import InputUrl from './InputUrl'
import './Listen.css'

const Listen = () => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | undefined>(undefined)
  const [url, setUrl] = useState('')
  return (
    <div className="listen">
      <Dropdown activeDropdown={activeDropdown} onChange={setActiveDropdown} />
      <InputUrl url={url} onChange={setUrl} />
    </div>
  )
}

export default Listen
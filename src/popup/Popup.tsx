import { useState } from 'react'

import Title from '../components/Title'
import Tabs, { TabId } from '../components/Tabs'
import Instruction from '../components/Instruction'
import Listen from '../components/Listen'
import Learn from '../components/Learn'

import './Popup.css'

export const Popup = () => {
  const [activeTab, setActiveTab] = useState<TabId>('instruction')

  return (
    <main>
      <Title />
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'instruction' && <Instruction />}
      {activeTab === 'listen' && <Listen />}
      {activeTab === 'learn' && <Learn />}
    </main>
  )
}

export default Popup

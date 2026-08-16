import './Tabs.css'

export type TabId = 'instruction' | 'listen' | 'learn'

const TABS: { id: TabId; label: string }[] = [
  { id: 'instruction', label: 'Instruction' },
  { id: 'listen', label: 'Listen' },
  { id: 'learn', label: 'Learn' },
]

type TabsProps = {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

const Tabs = ({ activeTab, onChange }: TabsProps) => {
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab${activeTab === tab.id ? ' tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default Tabs
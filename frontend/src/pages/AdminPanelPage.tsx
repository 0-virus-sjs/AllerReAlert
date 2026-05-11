import { Tabs, Tab, Container } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import { OrgsTab }      from './admin/OrgsTab'
import { UsersTab }     from './admin/UsersTab'
import { AllergensTab } from './admin/AllergensTab'
import { LogsTab }      from './admin/LogsTab'

const TAB_KEYS = ['orgs', 'users', 'allergens', 'logs'] as const
type TabKey = typeof TAB_KEYS[number]

function isTabKey(value: string | undefined): value is TabKey {
  return !!value && (TAB_KEYS as readonly string[]).includes(value)
}

export function AdminPanelPage() {
  const { tab } = useParams<{ tab?: string }>()
  const navigate = useNavigate()
  const activeKey: TabKey = isTabKey(tab) ? tab : 'orgs'

  return (
    <Container fluid className="p-4">
      <div className="mb-3">
        <h5 className="fw-bold mb-0">관리자 패널</h5>
        <small className="text-muted">단체·사용자·알레르기 마스터·시스템 로그 관리</small>
      </div>

      <Tabs
        activeKey={activeKey}
        onSelect={(k) => navigate(`/admin/${isTabKey(k ?? undefined) ? k : 'orgs'}`)}
        className="mb-3"
      >
        <Tab eventKey="orgs"      title="학교·단체 관리"><OrgsTab /></Tab>
        <Tab eventKey="users"     title="사용자 관리"><UsersTab /></Tab>
        <Tab eventKey="allergens" title="알레르기 마스터"><AllergensTab /></Tab>
        <Tab eventKey="logs"      title="시스템 로그"><LogsTab /></Tab>
      </Tabs>
    </Container>
  )
}

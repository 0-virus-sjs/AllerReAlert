import { useState } from 'react'
import { Tabs, Tab, Container } from 'react-bootstrap'
import { OrgsTab }      from './admin/OrgsTab'
import { UsersTab }     from './admin/UsersTab'
import { AllergensTab } from './admin/AllergensTab'
import { LogsTab }      from './admin/LogsTab'

export function AdminPanelPage() {
  const [key, setKey] = useState('orgs')

  return (
    <Container fluid className="p-4">
      <div className="mb-3">
        <h5 className="fw-bold mb-0">관리자 패널</h5>
        <small className="text-muted">단체·사용자·알레르기 마스터·시스템 로그 관리</small>
      </div>

      <Tabs activeKey={key} onSelect={(k) => setKey(k ?? 'orgs')} className="mb-3">
        <Tab eventKey="orgs"      title="학교·단체 관리"><OrgsTab /></Tab>
        <Tab eventKey="users"     title="사용자 관리"><UsersTab /></Tab>
        <Tab eventKey="allergens" title="알레르기 마스터"><AllergensTab /></Tab>
        <Tab eventKey="logs"      title="시스템 로그"><LogsTab /></Tab>
      </Tabs>
    </Container>
  )
}

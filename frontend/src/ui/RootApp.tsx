import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Layout, Menu, Space, Table, Tag, Typography, message } from 'antd';
import { api, setToken, getToken } from '../api';

const { Header, Content } = Layout;

type View = 'buildings' | 'tickets';

export function RootApp() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<View>('buildings');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const loggedIn = !!getToken();

  const refreshBuildings = async () => {
    const list = await api.buildings();
    setBuildings(list);
  };

  const refreshTickets = async () => {
    const list = await api.tickets();
    setTickets(list);
  };

  useEffect(() => {
    if (!loggedIn) return;
    api.health().catch(() => {});
    refreshBuildings().catch(() => {});
    refreshTickets().catch(() => {});
  }, [loggedIn]);

  if (!loggedIn) {
    return <Login onLogged={(u) => setUser(u)} />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Text style={{ color: '#fff' }}>宿舍管理系统</Typography.Text>
        <Space>
          <Button onClick={() => { setToken(null); location.reload(); }}>退出</Button>
        </Space>
      </Header>
      <Content style={{ padding: 16, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Menu
          mode="horizontal"
          selectedKeys={[view]}
          onClick={(e) => setView(e.key as View)}
          items={[
            { key: 'buildings', label: '楼栋/房间/床位' },
            { key: 'tickets', label: '报修工单' },
          ]}
          style={{ marginBottom: 16 }}
        />

        {view === 'buildings' && (
          <Buildings buildings={buildings} onRefresh={refreshBuildings} />
        )}
        {view === 'tickets' && (
          <Tickets tickets={tickets} onRefresh={refreshTickets} />
        )}
      </Content>
    </Layout>
  );
}

function Login({ onLogged }: { onLogged: (u: any) => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <Card title="登录" style={{ width: 420 }}>
        <Form
          layout="vertical"
          onFinish={async (v) => {
            setLoading(true);
            try {
              const r = await api.login(v.email, v.password);
              setToken(r.token);
              onLogged(r.user);
              message.success('登录成功');
            } catch (e: any) {
              message.error(String(e.message || e));
            } finally {
              setLoading(false);
            }
          }}
          initialValues={{ email: 'admin@local', password: 'Admin123!' }}
        >
          <Form.Item name="email" label="邮箱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
          <Typography.Paragraph style={{ marginTop: 12, color: '#666' }}>
            默认管理员：admin@local / Admin123!
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}

function Buildings({ buildings, onRefresh }: { buildings: any[]; onRefresh: () => Promise<void> }) {
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const out: any[] = [];
    for (const b of buildings) {
      for (const r of b.rooms || []) {
        for (const bed of r.beds || []) {
          out.push({
            key: bed.id,
            building: b.name,
            room: `${r.floor}-${r.number}`,
            bed: bed.label,
          });
        }
      }
    }
    return out;
  }, [buildings]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="创建楼栋/房间/床位">
        <CreateEntities onDone={onRefresh} />
      </Card>
      <Card title="床位列表">
        <Table
          dataSource={rows}
          columns={[
            { title: '楼栋', dataIndex: 'building' },
            { title: '房间', dataIndex: 'room' },
            { title: '床位', dataIndex: 'bed' },
          ]}
        />
      </Card>
    </Space>
  );
}

function CreateEntities({ onDone }: { onDone: () => Promise<void> }) {
  const [msgApi, contextHolder] = message.useMessage();
  const [bForm] = Form.useForm();
  const [rForm] = Form.useForm();
  const [bedForm] = Form.useForm();

  return (
    <>
      {contextHolder}
      <Space align="start" wrap>
        <Card size="small" title="楼栋" style={{ width: 320 }}>
          <Form form={bForm} layout="vertical" onFinish={async (v) => {
            await api.createBuilding(v.name);
            msgApi.success('已创建楼栋');
            bForm.resetFields();
            await onDone();
          }}>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input placeholder="如：1号楼" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>

        <Card size="small" title="房间" style={{ width: 320 }}>
          <Form form={rForm} layout="vertical" onFinish={async (v) => {
            await api.createRoom(v.buildingId, Number(v.floor), v.number);
            msgApi.success('已创建房间');
            rForm.resetFields();
            await onDone();
          }}>
            <Form.Item name="buildingId" label="楼栋ID" rules={[{ required: true }]}>
              <Input placeholder="从 /buildings 返回中复制" />
            </Form.Item>
            <Form.Item name="floor" label="楼层" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="number" label="房间号" rules={[{ required: true }]}>
              <Input placeholder="如：302" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>

        <Card size="small" title="床位" style={{ width: 320 }}>
          <Form form={bedForm} layout="vertical" onFinish={async (v) => {
            await api.createBed(v.roomId, v.label);
            msgApi.success('已创建床位');
            bedForm.resetFields();
            await onDone();
          }}>
            <Form.Item name="roomId" label="房间ID" rules={[{ required: true }]}>
              <Input placeholder="从 /buildings 返回中复制" />
            </Form.Item>
            <Form.Item name="label" label="床位标签" rules={[{ required: true }]}>
              <Input placeholder="如：A / B / 上铺 / 下铺" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>
      </Space>
      <Typography.Paragraph style={{ marginTop: 12, color: '#666' }}>
        这是 MVP UI：为了不加路由和复杂联动，这里暂时用 ID 录入。后续我会补成下拉联动选择（楼栋→房间→床位）。
      </Typography.Paragraph>
    </>
  );
}

function Tickets({ tickets, onRefresh }: { tickets: any[]; onRefresh: () => Promise<void> }) {
  const [form] = Form.useForm();

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="新建工单">
        <Form form={form} layout="vertical" onFinish={async (v) => {
          await api.createTicket(v.title, v.description);
          message.success('已提交工单');
          form.resetFields();
          await onRefresh();
        }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button type="primary" htmlType="submit">提交</Button>
        </Form>
      </Card>

      <Card title="工单列表">
        <Table
          dataSource={tickets.map(t => ({ ...t, key: t.id }))}
          columns={[
            { title: '标题', dataIndex: 'title' },
            { title: '状态', dataIndex: 'status', render: (s) => <Tag>{String(s)}</Tag> },
            { title: '创建时间', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString() },
          ]}
        />
      </Card>
    </Space>
  );
}

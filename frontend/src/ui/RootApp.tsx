import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Layout, Menu, Select, Space, Table, Tag, Typography, message } from 'antd';
import { api, setToken, getToken } from '../api';

const { Header, Content } = Layout;

type View = 'buildings' | 'students' | 'tickets';

export function RootApp() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<View>('buildings');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
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

  const refreshStudents = async () => {
    const list = await api.students();
    setStudents(list);
  };

  useEffect(() => {
    if (!loggedIn) return;

    // Validate token early; if invalid, auto logout.
    api.me()
      .then(setUser)
      .catch(() => {
        setToken(null);
        location.reload();
      });

    api.health().catch(() => {});
    refreshBuildings().catch(() => {});
    refreshTickets().catch(() => {});
    refreshStudents().catch(() => {});
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
            { key: 'students', label: '学生入住' },
            { key: 'tickets', label: '报修工单' },
          ]}
          style={{ marginBottom: 16 }}
        />

        {view === 'buildings' && (
          <Buildings buildings={buildings} onRefresh={refreshBuildings} />
        )}
        {view === 'students' && (
          <Students students={students} buildings={buildings} onRefresh={refreshStudents} />
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
        <CreateEntities buildings={buildings} onDone={onRefresh} />
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

function CreateEntities({ buildings, onDone }: { buildings: any[]; onDone: () => Promise<void> }) {
  const [msgApi, contextHolder] = message.useMessage();
  const [bForm] = Form.useForm();
  const [rForm] = Form.useForm();
  const [bedForm] = Form.useForm();

  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const selectedBuildingId = Form.useWatch('buildingId', rForm);
  const roomsOfSelectedBuilding = (buildings.find((b) => b.id === selectedBuildingId)?.rooms || []) as any[];
  const roomOptions = roomsOfSelectedBuilding.map((r) => ({ label: `${r.floor}-${r.number}`, value: r.id }));

  return (
    <>
      {contextHolder}
      <Space align="start" wrap>
        <Card size="small" title="楼栋" style={{ width: 320 }}>
          <Form
            form={bForm}
            layout="vertical"
            onFinish={async (v) => {
              try {
                await api.createBuilding(v.name);
                msgApi.success('已创建楼栋');
                bForm.resetFields();
                await onDone();
              } catch (e: any) {
                msgApi.error(String(e.message || e));
              }
            }}
          >
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input placeholder="如：1号楼" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>

        <Card size="small" title="房间" style={{ width: 320 }}>
          <Form
            form={rForm}
            layout="vertical"
            onFinish={async (v) => {
              try {
                await api.createRoom(v.buildingId, Number(v.floor), v.number);
                msgApi.success('已创建房间');
                rForm.resetFields();
                await onDone();
              } catch (e: any) {
                msgApi.error(String(e.message || e));
              }
            }}
          >
            <Form.Item name="buildingId" label="楼栋" rules={[{ required: true }]}>
              <Select options={buildingOptions} placeholder="选择楼栋" />
            </Form.Item>
            <Form.Item name="floor" label="楼层" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={1} placeholder="如：3" />
            </Form.Item>
            <Form.Item name="number" label="房间号" rules={[{ required: true }]}>
              <Input placeholder="如：302" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>

        <Card size="small" title="床位" style={{ width: 320 }}>
          <Form
            form={bedForm}
            layout="vertical"
            onFinish={async (v) => {
              try {
                await api.createBed(v.roomId, v.label);
                msgApi.success('已创建床位');
                bedForm.resetFields();
                await onDone();
              } catch (e: any) {
                msgApi.error(String(e.message || e));
              }
            }}
          >
            <Form.Item name="buildingId2" label="楼栋" rules={[{ required: true }]}>
              <Select
                options={buildingOptions}
                placeholder="选择楼栋"
                onChange={() => {
                  bedForm.setFieldValue('roomId', undefined);
                }}
              />
            </Form.Item>
            <Form.Item
              shouldUpdate={(prev, cur) => prev.buildingId2 !== cur.buildingId2}
              noStyle
            >
              {() => {
                const bid2 = bedForm.getFieldValue('buildingId2');
                const rooms = (buildings.find((b) => b.id === bid2)?.rooms || []) as any[];
                const ropts = rooms.map((r) => ({ label: `${r.floor}-${r.number}`, value: r.id }));
                return (
                  <Form.Item name="roomId" label="房间" rules={[{ required: true }]}>
                    <Select options={ropts} placeholder="选择房间" />
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item name="label" label="床位标签" rules={[{ required: true }]}>
              <Input placeholder="如：A / B / 上铺 / 下铺" />
            </Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form>
        </Card>
      </Space>
      <Typography.Paragraph style={{ marginTop: 12, color: '#666' }}>
        现在已支持下拉联动选择楼栋/房间，并且提交失败会显示明确错误信息。
      </Typography.Paragraph>
    </>
  );
}

function Students({
  students,
  buildings,
  onRefresh,
}: {
  students: any[];
  buildings: any[];
  onRefresh: () => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [checkinForm] = Form.useForm();

  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="新增学生（MVP）">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await api.createStudent(v.userId, v.studentNo);
              message.success('已创建学生档案');
              form.resetFields();
              await onRefresh();
            } catch (e: any) {
              message.error(String(e.message || e));
            }
          }}
        >
          <Form.Item name="userId" label="用户ID" rules={[{ required: true }]}>
            <Input placeholder="先用 /admin/users 创建 user，然后填 userId（后续会做联动选择）" />
          </Form.Item>
          <Form.Item name="studentNo" label="学号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">创建</Button>
        </Form>
      </Card>

      <Card title="入住/退宿">
        <Form
          form={checkinForm}
          layout="inline"
          onFinish={async (v) => {
            try {
              await api.checkin(v.studentId, v.bedId);
              message.success('已入住');
              await onRefresh();
            } catch (e: any) {
              message.error(String(e.message || e));
            }
          }}
        >
          <Form.Item name="studentId" label="学生" rules={[{ required: true }]}>
            <Select
              style={{ width: 260 }}
              placeholder="选择学生"
              options={students.map((s) => ({
                label: `${s.user?.name || ''} (${s.studentNo})`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="buildingId" label="楼栋" rules={[{ required: true }]}>
            <Select style={{ width: 200 }} options={buildingOptions} placeholder="选择楼栋" />
          </Form.Item>

          <Form.Item shouldUpdate={(p, c) => p.buildingId !== c.buildingId} noStyle>
            {() => {
              const bid = checkinForm.getFieldValue('buildingId');
              const rooms = (buildings.find((b) => b.id === bid)?.rooms || []) as any[];
              const roomOptions = rooms.map((r) => ({ label: `${r.floor}-${r.number}`, value: r.id }));
              return (
                <Form.Item name="roomId" label="房间" rules={[{ required: true }]}>
                  <Select
                    style={{ width: 200 }}
                    options={roomOptions}
                    placeholder="选择房间"
                    onChange={() => checkinForm.setFieldValue('bedId', undefined)}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item shouldUpdate={(p, c) => p.roomId !== c.roomId} noStyle>
            {() => {
              const bid = checkinForm.getFieldValue('buildingId');
              const rid = checkinForm.getFieldValue('roomId');
              const rooms = (buildings.find((b) => b.id === bid)?.rooms || []) as any[];
              const beds = (rooms.find((r) => r.id === rid)?.beds || []) as any[];
              const bedOptions = beds.map((bed) => ({ label: bed.label, value: bed.id }));
              return (
                <Form.Item name="bedId" label="床位" rules={[{ required: true }]}>
                  <Select style={{ width: 160 }} options={bedOptions} placeholder="选择床位" />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Button type="primary" htmlType="submit">入住</Button>
        </Form>

        <Typography.Paragraph style={{ marginTop: 12, color: '#666' }}>
          提示：当前 MVP 没有做“床位占用过滤”，如果选到已占用床位会返回错误。
        </Typography.Paragraph>
      </Card>

      <Card title="学生列表">
        <Table
          dataSource={students.map((s) => ({ ...s, key: s.id }))}
          columns={[
            { title: '姓名', render: (_: any, r: any) => r.user?.name },
            { title: '学号', dataIndex: 'studentNo' },
            {
              title: '床位',
              render: (_: any, r: any) => {
                const bed = r.bed;
                if (!bed) return <Tag>未入住</Tag>;
                const room = bed.room;
                const building = room?.building;
                return `${building?.name || ''} ${room?.floor || ''}-${room?.number || ''} 床位${bed.label}`;
              },
            },
            {
              title: '操作',
              render: (_: any, r: any) => (
                <Button
                  disabled={!r.bed}
                  onClick={async () => {
                    try {
                      await api.checkout(r.id);
                      message.success('已退宿');
                      await onRefresh();
                    } catch (e: any) {
                      message.error(String(e.message || e));
                    }
                  }}
                >
                  退宿
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

function Tickets({ tickets, onRefresh }: { tickets: any[]; onRefresh: () => Promise<void> }) {
  const [form] = Form.useForm();

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="新建工单">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await api.createTicket(v.title, v.description);
              message.success('已提交工单');
              form.resetFields();
              await onRefresh();
            } catch (e: any) {
              message.error(String(e.message || e));
            }
          }}
        >
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
          dataSource={tickets.map((t) => ({ ...t, key: t.id }))}
          columns={[
            { title: '标题', dataIndex: 'title' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s, r) => (
                <Space>
                  <Tag>{String(s)}</Tag>
                  <Select
                    style={{ width: 160 }}
                    value={String(s)}
                    options={[
                      { value: 'open', label: 'open' },
                      { value: 'in_progress', label: 'in_progress' },
                      { value: 'resolved', label: 'resolved' },
                      { value: 'closed', label: 'closed' },
                    ]}
                    onChange={async (v) => {
                      try {
                        await api.updateTicket(r.id, v as any);
                        message.success('已更新状态');
                        await onRefresh();
                      } catch (e: any) {
                        message.error(String(e.message || e));
                      }
                    }}
                  />
                </Space>
              ),
            },
            { title: '创建时间', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString() },
          ]}
        />
      </Card>
    </Space>
  );
}

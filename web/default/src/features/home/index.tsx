/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { Markdown } from '@/components/ui/markdown'
import { RelayMark } from '@/components/layout/components/relay-mark'
import { useHomePageContent } from './hooks'

const configSnippet = `{
  "env": {
    "ANTHROPIC_BASE_URL": "https://app.tokensrelay.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-tr-xxxxxxxxxxxx",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5"
  },
  "model": "claude-opus-4-7"
}`

const providers = [
  ['Claude', 'Opus · Sonnet · Haiku'],
  ['OpenAI', 'GPT 全系列'],
  ['Gemini', 'Google 全系列'],
] as const

const features = [
  {
    no: '01 · 聚合',
    title: '主流模型，一处接入',
    body: 'Claude、GPT、Gemini 等主流模型，通过统一入口调用与切换，不再需要为不同模型维护多套 endpoint 与密钥。',
    label: '已接入供应商',
    stat: 'OpenAI / Claude / Google',
  },
  {
    no: '02 · 稳定',
    title: '低延迟，高可用',
    body: '多节点智能路由，自动故障转移。多模型、多账号自动负载均衡，官方渠道，安全可靠。',
    label: '服务可用性',
    stat: '99.95%',
  },
  {
    no: '03 · 透明',
    title: '按 Token 精确计费',
    body: '官方定价基础上的透明计费，预付费、无月租、无隐藏费用。控制台实时查看消耗，支持按项目、按 Key 的成本分摊。',
    label: '月租与隐藏费用',
    stat: '0',
  },
  {
    no: '04 · 隐私',
    title: '请求内容零留存',
    body: '默认不记录 Prompt 与 Completion 正文，仅保留计费所需的元数据。端到端 TLS 加密传输，符合企业合规要求。',
    label: '日志保留期',
    stat: '0 天',
  },
] as const

const metrics = [
  ['30', '+', '接入模型'],
  ['138', 'ms', '平均首字延迟'],
  ['99.95', '%', '可用性 SLA'],
  ['0', '', '日志留存'],
] as const

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const consoleHref = isAuthenticated ? '/dashboard' : '/sign-in'
  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = isAuthenticated ? t('Go to Dashboard') : '获取 API Key'

  const highlightedConfig = useMemo(
    () =>
      configSnippet
        .replaceAll('"env"', '<span class="c-key">"env"</span>')
        .replaceAll(
          '"ANTHROPIC_BASE_URL"',
          '<span class="c-key">"ANTHROPIC_BASE_URL"</span>'
        )
        .replaceAll(
          '"ANTHROPIC_AUTH_TOKEN"',
          '<span class="c-key">"ANTHROPIC_AUTH_TOKEN"</span>'
        )
        .replaceAll(
          '"ANTHROPIC_DEFAULT_OPUS_MODEL"',
          '<span class="c-key">"ANTHROPIC_DEFAULT_OPUS_MODEL"</span>'
        )
        .replaceAll(
          '"ANTHROPIC_DEFAULT_SONNET_MODEL"',
          '<span class="c-key">"ANTHROPIC_DEFAULT_SONNET_MODEL"</span>'
        )
        .replaceAll(
          '"ANTHROPIC_DEFAULT_HAIKU_MODEL"',
          '<span class="c-key">"ANTHROPIC_DEFAULT_HAIKU_MODEL"</span>'
        )
        .replaceAll('"model"', '<span class="c-key">"model"</span>')
        .replaceAll(
          '"https://app.tokensrelay.com"',
          '<span class="c-str">"https://app.tokensrelay.com"</span>'
        )
        .replaceAll(
          '"sk-tr-xxxxxxxxxxxx"',
          '<span class="c-str">"sk-tr-xxxxxxxxxxxx"</span>'
        )
        .replaceAll(
          '"claude-opus-4-7"',
          '<span class="c-str">"claude-opus-4-7"</span>'
        )
        .replaceAll(
          '"claude-sonnet-4-6"',
          '<span class="c-str">"claude-sonnet-4-6"</span>'
        )
        .replaceAll(
          '"claude-haiku-4-5"',
          '<span class="c-str">"claude-haiku-4-5"</span>'
        ),
    []
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configSnippet)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = configSnippet
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (!isLoaded) {
    return (
      <main className='tr-home tr-home-loading'>
        <div className='tr-wrap'>{t('Loading...')}</div>
      </main>
    )
  }

  if (content) {
    return isUrl ? (
      <iframe
        src={content}
        className='h-screen w-full border-none'
        title={t('Custom Home Page')}
      />
    ) : (
      <main className='tr-home'>
        <div className='tr-wrap py-8'>
          <Markdown className='custom-home-content'>{content}</Markdown>
        </div>
      </main>
    )
  }

  return (
    <div className='tr-home'>
      <nav className='tr-home-nav' aria-label='主导航'>
        <div className='tr-wrap tr-home-nav-inner'>
          <Link to='/' className='tr-home-brand'>
            <RelayMark className='size-[22px]' strokeWidth={1.8} />
            <span>智驿 TokensRelay</span>
          </Link>
          <div className='tr-home-links'>
            <a href='#models'>模型</a>
            <a href='#features'>特性</a>
            <a href='#setup'>接入</a>
            <Link to='/pricing'>定价</Link>
            <Link className='tr-home-btn tr-home-btn-primary' to={consoleHref}>
              进入控制台
            </Link>
          </div>
          <button
            className='tr-home-menu-btn'
            type='button'
            aria-label='打开菜单'
            aria-expanded={menuOpen}
            aria-haspopup='true'
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={menuOpen ? 'tr-home-mobile open' : 'tr-home-mobile'}>
        <a href='#models' onClick={() => setMenuOpen(false)}>
          模型
        </a>
        <a href='#features' onClick={() => setMenuOpen(false)}>
          特性
        </a>
        <a href='#setup' onClick={() => setMenuOpen(false)}>
          接入
        </a>
        <Link to='/pricing' onClick={() => setMenuOpen(false)}>
          定价
        </Link>
        <Link
          className='tr-home-btn tr-home-btn-primary'
          to={consoleHref}
          onClick={() => setMenuOpen(false)}
        >
          进入控制台
        </Link>
      </div>

      <header className='tr-home-hero'>
        <div className='tr-wrap tr-home-hero-inner'>
          <div>
            <p className='tr-home-eyebrow'>TokensRelay · 统一大模型网关</p>
            <h1>
              一站接入，
              <br />
              <span>直达万模</span>
            </h1>
            <p className='tr-home-slogan'>One relay. Every model.</p>
            <p className='tr-home-lede'>
              为开发者与团队打造的统一模型网关。替换一行配置，即可直达
              Claude、GPT、Gemini 等主流模型，无需修改代码，无需管理多套密钥。
            </p>
            <div className='tr-home-cta-row'>
              <Link className='tr-home-btn tr-home-btn-primary' to={primaryHref}>
                {primaryLabel}
              </Link>
              <a className='tr-home-btn tr-home-btn-secondary' href='#setup'>
                查看接入方式
              </a>
            </div>
            <p className='tr-home-meta'>
              30+ 模型 · 138ms 平均首字延迟 · 99.95% 可用性
            </p>
          </div>

          <aside className='tr-paper-code' aria-label='终端会话示例'>
            <div className='tr-paper-code-bar'>
              <span>~/project — claude</span>
            </div>
            <div className='tr-paper-code-body'>
              <pre>
                <span className='c-dim'># 在 ~/.claude/settings.json 中配置一次</span>
                {'\n'}
                <span className='c-prompt'>➜</span>{' '}
                <span className='c-str'>~/project</span> claude{' '}
                <span className='c-str'>"帮我重构订单执行模块"</span>
                {'\n\n'}
                <span className='c-dim'>● 已连接</span> app.tokensrelay.com{' '}
                <span className='c-dim'>→ claude-opus-4-7</span>
                {'\n'}
                <span className='c-dim'>
                  ● 路由节点 TYO · 延迟 138ms · 上下文 200K
                </span>
                {'\n\n'}⏺ 正在分析 src/orders/*.rs{' '}
                <span className='c-dim'>(4 个文件, 2,184 行)…</span>
                {'\n'}⏺ 建议拆分 OrderExecutor 为三个模块：
                {'\n'}
                <span className='c-dim'>    ├─</span> executor.rs{'     '}
                <span className='c-dim'># 核心调度</span>
                {'\n'}
                <span className='c-dim'>    ├─</span> router.rs{'       '}
                <span className='c-dim'># 路由决策</span>
                {'\n'}
                <span className='c-dim'>    └─</span> simulator.rs{'    '}
                <span className='c-dim'># 交易模拟</span>
                {'\n\n'}
                <span className='c-prompt'>➜</span>{' '}
                <span className='c-str'>~/project</span>{' '}
                <span className='c-caret' />
              </pre>
            </div>
          </aside>
        </div>
      </header>

      <section className='tr-home-section tr-home-section-tight' id='models'>
        <div className='tr-wrap'>
          <SectionHead
            number='01'
            title='支持的模型'
            lead='官方渠道直连，统一入口调用与切换。'
          />
          <div className='tr-providers-row'>
            {providers.map(([name, desc]) => (
              <div className='tr-provider' key={name}>
                {name}
                <small>{desc}</small>
              </div>
            ))}
          </div>
          <p className='tr-providers-note'>
            完整模型清单与单价见 <Link to='/pricing'>模型定价表</Link>。
          </p>
        </div>
      </section>

      <section className='tr-home-section' id='features'>
        <div className='tr-wrap'>
          <SectionHead
            number='02'
            title='唯一承诺：不掺水'
            lead='从流式传输到工具调用，每一个细节都经过打磨。'
          />
          <div className='tr-features-grid'>
            {features.map((feature) => (
              <article className='tr-feature' key={feature.no}>
                <p className='tr-feature-no'>{feature.no}</p>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <div className='tr-feature-stat'>
                  <span>{feature.label}</span>
                  <strong>{feature.stat}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='tr-home-section tr-home-section-tight' id='setup'>
        <div className='tr-wrap'>
          <SectionHead
            number='03'
            title='改一个配置文件，两分钟完成迁移'
            lead='智驿提供 Claude Code 所需的兼容接入方式。你只需要替换 endpoint，其余一切照旧。'
          />
          <div className='tr-setup-grid'>
            <div>
              <Step
                number='1'
                title='获取智驿 API Key'
                body={
                  <>
                    在 <Link to='/keys'>控制台</Link> 创建一个新的 API Key，以{' '}
                    <span className='tr-chip'>sk-tr-</span> 开头。
                  </>
                }
              />
              <Step
                number='2'
                title='编辑 Claude Code 配置'
                body={
                  <>
                    打开 <span className='tr-chip'>~/.claude/settings.json</span>
                    ，设置环境变量指向智驿。
                  </>
                }
              />
              <Step
                number='3'
                title='重启并选择模型'
                body={
                  <>
                    执行 <span className='tr-chip'>claude</span> 即可。使用{' '}
                    <span className='tr-chip'>/model</span> 切换到不同 GPT 模型。
                  </>
                }
              />
            </div>
            <div className='tr-paper-code'>
              <div className='tr-paper-code-bar'>
                <span>~/.claude/settings.json</span>
                <button
                  className={copied ? 'tr-copy-btn ok' : 'tr-copy-btn'}
                  type='button'
                  onClick={handleCopy}
                >
                  {copied ? '已复制 ✓' : 'COPY'}
                </button>
              </div>
              <div className='tr-paper-code-body'>
                <pre dangerouslySetInnerHTML={{ __html: highlightedConfig }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='tr-home-metrics' aria-label='平台数据'>
        <div className='tr-wrap tr-metrics-grid'>
          {metrics.map(([value, suffix, label]) => (
            <div className='tr-metric' key={label}>
              <p className='tr-metric-value'>
                {value}
                {suffix ? <small>{suffix}</small> : null}
              </p>
              <p className='tr-metric-label'>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='tr-home-section tr-home-final'>
        <div className='tr-wrap'>
          <h2>让你的 AI 工具，自由选择最适合的模型</h2>
          <p>注册即可开始使用。按量扣费，用多少付多少。</p>
          <div className='tr-home-cta-row center'>
            <Link className='tr-home-btn tr-home-btn-primary' to={primaryHref}>
              {primaryLabel}
            </Link>
            <a className='tr-home-btn tr-home-btn-ghost' href='#setup'>
              阅读接入文档
            </a>
          </div>
        </div>
      </section>

      <footer className='tr-home-footer'>
        <div className='tr-wrap'>
          <div className='tr-footer-grid'>
            <div>
              <Link to='/' className='tr-home-brand'>
                <RelayMark className='size-5' strokeWidth={1.8} />
                <span>智驿 TokensRelay</span>
              </Link>
              <p>统一的大模型 API 网关。一站接入，直达万模。</p>
            </div>
            <FooterColumn
              title='产品'
              links={[
                ['模型列表', '/pricing'],
                ['定价', '/pricing'],
                ['控制台', consoleHref],
              ]}
            />
            <FooterColumn
              title='开发者'
              links={[
                ['接入概览', '#setup'],
                ['Claude Code 接入', '#setup'],
                ['常见问题', '#features'],
              ]}
            />
            <FooterColumn
              title='公司'
              links={[
                ['服务条款', '/user-agreement'],
                ['隐私政策', '/privacy-policy'],
              ]}
            />
          </div>
          <div className='tr-footer-bottom'>
            <span>© 2026 智驿 TokensRelay · tokensrelay.com</span>
            <span className='tr-footer-status'>
              <i />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHead(props: { number: string; title: string; lead: string }) {
  return (
    <div className='tr-section-head'>
      <p>{props.number}</p>
      <h2>{props.title}</h2>
      <span>{props.lead}</span>
    </div>
  )
}

function Step(props: {
  number: string
  title: string
  body: ReactNode
}) {
  return (
    <div className='tr-step'>
      <p>{props.number}</p>
      <div>
        <h3>{props.title}</h3>
        <div>{props.body}</div>
      </div>
    </div>
  )
}

function FooterColumn(props: {
  title: string
  links: ReadonlyArray<readonly [string, string]>
}) {
  return (
    <div className='tr-footer-col'>
      <h4>{props.title}</h4>
      <ul>
        {props.links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('#') ? (
              <a href={href}>{label}</a>
            ) : (
              <Link to={href}>{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

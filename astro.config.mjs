// @ts-check
import { defineConfig } from 'astro/config';

import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project-site URL: https://system4us.github.io/salamandr-website/.
  // `site` is the origin, `base` is the path prefix Pages serves this repo
  // under — see .github/workflows/deploy.yml. Switching to a custom domain
  // later means dropping `base` back to '/' and adding a public/CNAME file.
  site: 'https://system4us.github.io',
  base: '/salamandr-website/',

  integrations: [
    starlight({
      title: 'Salamandr Docs',
      description: 'Self-hosted helpdesk you keep custody of. Getting started, deployment and edition guides.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/system4us/salamandr-website' }
      ],
      editLink: {
        baseUrl: 'https://github.com/system4us/salamandr-website/edit/main/'
      },
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'What is Salamandr', slug: 'docs/what-is-salamandr' },
            { label: 'Community vs Enterprise', slug: 'docs/editions' },
            { label: 'Quickstart (Docker Compose)', slug: 'docs/quickstart' }
          ]
        },
        {
          label: 'Helpdesk Core',
          items: [
            { label: 'Ticket List & Filters', slug: 'docs/ticket-list' },
            { label: 'Ticket Detail & Composer', slug: 'docs/ticket-detail-page' },
            { label: 'Customers Directory', slug: 'docs/customers' },
            { label: 'Organizations (B2B)', slug: 'docs/organizations' },
            { label: 'Website Live Chat', slug: 'docs/livechat' },
            { label: 'Operational Reports', slug: 'docs/reports' },
            { label: 'Analytics & BI Engine', slug: 'docs/analytics' }
          ]
        },
        {
          label: 'Routing & Organization',
          items: [
            { label: 'Staff & Agent Seats', slug: 'docs/staff' },
            { label: 'Support Teams', slug: 'docs/teams' },
            { label: 'Automated Routing Rules', slug: 'docs/routing' },
            { label: 'Agent Skills & Assignment', slug: 'docs/skills' },
            { label: 'SLA Policies & Working Hours', slug: 'docs/slas' }
          ]
        },
        {
          label: 'Data Model & Automations',
          items: [
            { label: 'Ticket Types', slug: 'docs/ticket-types' },
            { label: 'Custom Fields', slug: 'docs/custom-fields' },
            { label: 'Tags & Tag Profiles', slug: 'docs/tags' },
            { label: 'Macros & Canned Responses', slug: 'docs/macros' },
            { label: 'Visual Bot Flows & Triage', slug: 'docs/bot-flows' }
          ]
        },
        {
          label: 'Channels & Inbound',
          items: [
            { label: 'Connecting Channels', slug: 'docs/channels' },
            { label: 'Email Inbound & Outbound', slug: 'docs/email-settings' },
            { label: 'WhatsApp & Meta Messaging', slug: 'docs/whatsapp-channel' },
            { label: 'ChatOps (Slack, Teams, Discord)', slug: 'docs/chatops' }
          ]
        },
        {
          label: 'Knowledge & AI',
          items: [
            { label: 'Help Center & Articles', slug: 'docs/help-center' },
            { label: 'Local AI & Document RAG', slug: 'docs/ai-assist' },
            { label: 'AI Log Triage', slug: 'docs/log-triage' }
          ]
        },
        {
          label: 'Meetings & Calendars',
          items: [
            { label: 'Meetings & Video Rooms', slug: 'docs/meetings' },
            { label: 'Calendar Sync & iCal Feeds', slug: 'docs/calendar-sync' }
          ]
        },
        {
          label: 'Administration & Security',
          items: [
            { label: 'Help Center Branding', slug: 'docs/branding' },
            { label: 'Notifications & Web Push', slug: 'docs/notifications' },
            { label: 'Access Control & Custom Roles', slug: 'docs/access-control' },
            { label: 'Single Sign-On (SAML/OIDC)', slug: 'docs/sso' },
            { label: 'Audit Log & Compliance', slug: 'docs/audit-log' }
          ]
        },
        {
          label: 'Extend & Plugins (WASM)',
          items: [
            { label: 'Build a CRM Plugin (Modular Architecture)', slug: 'docs/build-crm-plugin' },
            { label: 'Build a Task & Issue Tracker Plugin', slug: 'docs/build-task-tracker-plugin' },
            { label: 'Inbound Webhooks & Events', slug: 'docs/inbound-webhooks' },
            { label: 'Build a Plugin in TypeScript', slug: 'docs/build-a-plugin-typescript' },
            { label: 'Build a Plugin in Rust', slug: 'docs/build-a-plugin' },
            { label: 'HMS Clinical Context Guide', slug: 'docs/hms-wasm-plugin-guide' },
            { label: 'Extension Kinds & Architecture', slug: 'docs/extension-kinds' }
          ]
        },
        {
          label: 'Deploying & Operations',
          items: [
            { label: 'Single Host (Docker Compose)', slug: 'docs/deployment' },
            { label: 'Kubernetes with Helm', slug: 'docs/deploy-helm' },
            { label: 'Docker Swarm Stack', slug: 'docs/deploy-swarm' },
            { label: 'Multi-Instance Fleet Orchestration', slug: 'docs/multi-instance-deployments' },
            { label: 'Enterprise Licensing', slug: 'docs/enterprise-licensing' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { label: 'REST API & Webhooks', slug: 'docs/api-reference' },
            { label: 'FAQ', slug: 'docs/faq' }
          ]
        }
      ],
      customCss: ['./src/styles/starlight-overrides.css']
    })
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
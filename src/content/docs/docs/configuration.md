---
title: "Staff, teams & routing"
description: How to add agents, organize them into teams, and route new tickets automatically — from the Admin Panel or as code.
---

Everything below happens in the Admin Panel once you're logged in as the admin account from
the [quickstart](../quickstart/). It's ordinary point-and-click configuration — this page
just explains what each piece actually does before you click into it.

## Adding staff and agents

**Admin Panel → Users → Invite.** You give a name, email and role (`admin` or `agent`); the
account is created with a random password nobody — including you — ever sees, and a real
invitation email goes out with a link for that person to set their own. There's no "temporary
password" to hand someone over Slack.

Community edition is capped at **5 staff seats** — the 6th invite is refused with a message
saying so, not silently allowed. [Enterprise](../enterprise-licensing/) removes the cap
entirely rather than raising it to a different fixed number. Customer accounts (people who file
tickets) don't count against this at all — the cap is on staff, not on how many people you
support.

## Teams

**Admin Panel → Teams.** A team is just a name plus a set of member agents — nothing more
structural than that. What it's *for* is routing and assignment: a ticket can be assigned to a
team as well as (or instead of) a specific agent, so "anyone on Billing can pick this up" is a
real state a ticket can be in, not a convention agents have to remember.

## Skills

**Admin Panel → Skills.** A skill is just a name ("Billing", "German-speaking", "Kubernetes")
that you tag agents with. On its own that's a directory; what makes it load-bearing is the
`assign_by_skill` routing action below — an admin doesn't have to know, ticket by ticket, which
three people speak German, only that the rule should route to "whoever holds this skill and has
the fewest open tickets right now."

## Routing rules

**Admin Panel → Routing Rules.** A rule fires when a ticket is created (or, for a second class
of rules, when one is updated) and can assign it to an agent or a team automatically, so new
tickets don't all land in one shared queue for someone to manually triage.

A rule has:

- **Conditions** — matched against the requester and the ticket, on: requester email,
  organization, department, country, "zone", VIP level, ticket type, channel source, status, or
  priority. Operators are `equals`/`contains` for text and `gte`/`lte` for numeric fields like
  priority. A rule can require **all** of its conditions to match or **any** of them — your
  choice per rule.
- **Channel source** singles out one specific connected number or account — e.g. your support
  WhatsApp number versus a sales one, or one Telegram bot versus another — rather than just
  "this came in over WhatsApp." [Sources](../channels/) can hold several numbers/bots of the
  same channel type, and this is what lets each one route differently.
- **An action** — `assign_agent` (a specific person), `assign_team`, or `assign_by_skill`
  (resolved at the moment the ticket is filed, to whichever eligible agent holding that skill
  currently has the lightest load — not a fixed person, so it stays balanced as workload
  shifts).

Rules are evaluated **in order, first match wins** — a ticket that matches rule 1 never reaches
rule 2, so put your most specific rules first and a catch-all last. A ticket that matches no
rule stays unassigned, exactly like a deployment with no routing rules configured at all — there
is no failure mode from adding rules, only ones you didn't write yet.

## SLA policies & business hours

**Admin Panel → SLA Policies** sets a resolution-time target (in hours) per priority level —
Urgent might be 4 hours, Low might be 48. On its own that's wall-clock time from ticket
creation.

**Admin Panel → Business Hours** is what makes that number mean something a customer would
recognize: a weekly schedule of working windows (more than one per day, for a lunch break),
holidays, and a timezone. Turn it on and a "4 hour" SLA stops counting overnight and over a
public holiday. It's opt-in per tenant — skip it and deadlines stay simple `created_at + N
hours` math, which is fine for a team that's staffed around the clock anyway.

## Macros & canned responses

**Admin Panel → Macros** bundles a reply body with property changes (status, priority, tags) an
agent applies in one click instead of setting each field by hand. A macro that closes a ticket
doesn't fire the customer-facing "resolved" notification until the agent actually sends their
reply — so applying one never emails a customer a context-free status change before the agent
has explained anything.

**Admin Panel → Canned Responses** is the simpler cousin: just a reusable reply body, no
property changes attached.

## Configuration as code

Clicking through the Admin Panel for a first tenant is fine; setting up the *tenth* one the
same way isn't. **`salamandrctl`** drives all of the above — staff, teams, ticket types, SLA
policies, macros, canned responses, business hours, routing rules, and more — from one JSON
file, matching existing resources by name (never a database id) so the same config file is safe
to re-apply after someone edits something by hand in the UI.

It ships as a container image, versioned with the release it came from — mount the directory
holding your config file at `/work`:

```sh
docker run --rm -v "$PWD:/work" \
  -e SALAMANDR_URL=https://helpdesk.example.com \
  -e SALAMANDR_EMAIL=admin@example.com -e SALAMANDR_PASSWORD=... \
  system4us/salamandrctl:latest diff -f config.json

docker run --rm -v "$PWD:/work" \
  -e SALAMANDR_URL=https://helpdesk.example.com \
  -e SALAMANDR_EMAIL=admin@example.com -e SALAMANDR_PASSWORD=... \
  system4us/salamandrctl:latest apply -f config.json
```

Prefer the environment variables over the equivalent flags — they keep credentials out of
shell history and out of `docker ps`. From a checkout of the source, the same two commands are
`go run ./cmd/salamandrctl diff -f config.json -server ... -email ... -password ...` and its
`apply` counterpart.

`diff` shows what would change without writing anything; `apply` does it for real. See
`cmd/salamandrctl/main.go`'s package doc in the repository for the complete config schema.

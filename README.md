# Vue Timeline Scheduler

A flexible and customizable timeline scheduler component for Vue 3.

## Features

- 📅 Grouped Headers (Year, Month, Week, Day)
- 🔍 Custom Zoom Levels
- 🎨 Customizable Styling
- 📦 TypeScript Support
- ⚡ Powered by Vite & Vue 3

## Installation

```bash
npm install vue-timeline-scheduler
# or
bun add vue-timeline-scheduler
```

## Usage

```vue
<script setup lang="ts">
import { Scheduler } from 'vue-timeline-scheduler'
import 'vue-timeline-scheduler/style.css' // Import styles
import moment from 'moment'

const headers = [
  { group: 'month', format: 'MMMM YYYY' },
  { group: 'day', format: 'DD' },
]

const startDate = moment().startOf('month').toDate()
const endDate = moment().endOf('month').toDate()
</script>

<template>
  <Scheduler :headers="headers" :start-date="startDate" :end-date="endDate" />
</template>
```

## Props

| Prop                  | Type                 | Default                               | Description                            |
| --------------------- | -------------------- | ------------------------------------- | -------------------------------------- |
| `headers`             | `SchedulerHeader[]`  | `[{ group: 'year', format: 'yyyy' }]` | Configuration for timeline headers     |
| `startDate`           | `Date \| string`     | `Jan 1st`                             | Start date of the timeline             |
| `endDate`             | `Date \| string`     | `Dec 31st`                            | End date of the timeline               |
| `scale`               | `SchedulerZoomScale` | `{ scale: 'day', step: 1 }`           | Zoom scale configuration               |
| `headerHeight`        | `number`             | `30`                                  | Height of each header row in pixels    |
| `resourceColumnWidth` | `number`             | `120`                                 | Width of the resource column in pixels |

## Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build
```

## License

MIT

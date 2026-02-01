<template>
  <div
    class="scheduler"
    :style="{
      '--scheduler-prop-height': height,
      '--scheduler-prop-width': width,
      '--scheduler-prop-header-height': headerHeight + 'px',
      '--scheduler-prop-header-rows': headerRowCount,
      '--scheduler-prop-resource-width': resourceWidth + 'px',
      '--scheduler-prop-resource-height': resourceHeight + 'px',
      '--scheduler-prop-total-columns': totalColumns,
      '--scheduler-prop-total-rows': totalRows,
    }"
  >
    <div class="scheduler-resource">
      <div class="scheduler-resource-corner"></div>
      <div class="scheduler-resource-divider"></div>
      <div class="scheduler-resource-scroll">
        <div class="scheduler-resource-container">
          <div class="scheduler-resource-row-empty"></div>
          <div
            v-for="(resource, rowIndex) in resources"
            :key="rowIndex"
            class="scheduler-resource-row"
            :style="{
              top: rowIndex * resourceHeight + 'px',
            }"
          >
            <div class="scheduler-resource-row-label">
              {{ resource.label }}
            </div>
            <div class="scheduler-resource-row-divider"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="scheduler-divider"></div>
    <div class="scheduler-timeline">
      <div class="scheduler-timeline-header-scroll" ref="timelineHeaderScroll">
        <div class="scheduler-timeline-header-container">
          <div class="scheduler-timeline-header-group">
            <template v-for="(group, groupIndex) in headerGroups" :key="groupIndex">
              <div
                v-for="(header, headerIndex) in group"
                :key="headerIndex"
                aria-hidden="true"
                class="scheduler-timeline-header"
                :style="{
                  left: header.left + 'px',
                  width: header.width + 'px',
                  top: groupIndex * headerHeight + 'px',
                }"
              >
                <div
                  :class="
                    'scheduler-timeline-header-cell ' +
                    (groupIndex != headerGroups.length - 1
                      ? 'scheduler-timeline-header-cell-inner'
                      : '')
                  "
                  v-intersection-observer="handleHeaderIntersection"
                ></div>
                <div class="scheduler-timeline-header-cell-label">
                  {{ header.label }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="scheduler-body" ref="schedulerBody" @scroll="handleBodyScroll">
        <div class="scheduler-body-matrix">
          <div style="position: absolute">
            <div
              class="scheduler-body-matrix-date-cell"
              v-for="({ date, resourceId, left, top, width }, dateIndex) in resourceXDates"
              :key="dateIndex"
              :data-date="date.format('YYYY-MM-DD')"
              :data-resource-id="resourceId"
              :style="{
                left: left + 'px',
                top: top + 'px',
                width: width + 'px',
              }"
            ></div>
          </div>
          <div style="position: absolute">
            <div
              v-for="(top, index) in horizontalLines"
              :key="'h-' + index"
              class="scheduler-body-matrix-divider-horizontal"
              :style="{ top: top + 'px' }"
            ></div>
            <div
              v-for="(left, index) in verticalLines"
              :key="'v-' + index"
              class="scheduler-body-matrix-divider-vertical"
              :style="{ left: left - 1 + 'px' }"
            ></div>
          </div>
        </div>
      </div>
      <div class="scheduler-timeline-divider"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// #region Imports
import moment from 'moment'
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { SchedulerHeader, SchedulerResource, SchedulerZoomScale } from '../../types/scheduler'
import { vIntersectionObserver } from '@vueuse/components'
// #endregion

// #region Props
const props = defineProps<{
  height?: string | number
  width?: string | number

  headers?: Array<SchedulerHeader>
  headerHeight?: number

  startDate?: Date | string
  endDate?: Date | string

  scale?: SchedulerZoomScale

  resources?: Array<SchedulerResource>
  resourceWidth?: number
  resourceHeight?: number
}>()
// #endregion

// #region Config
const height = computed(() => props.height || '600px')
const width = computed(() => props.width || '800px')

const startDate = computed(() => props.startDate || moment().startOf('year').toDate())
const endDate = computed(() => props.endDate || moment().add(1, 'year').endOf('year').toDate())

const scale = computed(
  () =>
    props.scale ||
    ({
      scale: 'd',
      step: 1,
    } as SchedulerZoomScale),
)

const totalColumns = computed(() => {
  const start = moment(startDate.value)
  const end = moment(endDate.value)
  const diff = end.diff(start, scale.value.scale) + 1
  return diff / scale.value.step
})

const totalRows = computed(() => {
  return resources.value.length
})
// #endregion

// #region Header
const headers = computed<Array<SchedulerHeader>>(
  () =>
    props.headers || [
      { group: 'month', format: 'MMMM YYYY' },
      { group: 'week', format: '[W-]WW' },
      {
        group: 'day',
        format: 'DD',
        step: 1,
      },
    ],
)

const headerHeight = computed(() => props.headerHeight || 30)
const headerRowCount = computed(() => headers.value.length)

const headerGroups = computed(() => {
  const groups: Array<
    Array<{ label: string; start: moment.Moment; end: moment.Moment; width: number; left: number }>
  > = []

  for (let i = 0; i < headers.value.length; i++) {
    const header = headers.value[i]
    if (!header) continue

    const headerGroup: Array<{
      label: string
      start: moment.Moment
      end: moment.Moment
      width: number
      left: number
    }> = []

    const start = moment(startDate.value).startOf(header.group)
    const end = moment(endDate.value).endOf(header.group)

    let current = start.clone()

    while (current.isSameOrBefore(end, header.group)) {
      const groupStart = current.clone().startOf(header.group)
      const groupEnd = current
        .clone()
        .add((header.step || 1) - 1, header.group)
        .endOf(header.group)

      // Clamp the group start and end to the visible scheduler range
      const visibleStart = moment.max(groupStart, moment(startDate.value))
      const visibleEnd = moment.min(groupEnd, moment(endDate.value))

      // Calculate the width based on the visible portion only
      const columnCount = visibleEnd.diff(visibleStart, scale.value.scale, true)
      const width = (columnCount / (scale.value.step || 1)) * headerHeight.value

      // Calculate the left position from the start date (always >= 0)
      const left = Math.max(
        0,
        (groupStart.diff(moment(startDate.value), scale.value.scale, true) /
          (scale.value.step || 1)) *
          headerHeight.value,
      )

      headerGroup.push({
        label: current.format(header.format || 'YYYY'),
        start: groupStart,
        end: groupEnd,
        width,
        left,
      })

      current.add(header.step || 1, header.group)
    }

    groups.push(headerGroup)
  }

  return groups
})
// #endregion

// #region Resource
const resourceWidth = computed(() => props.resourceWidth || 120)
const resourceHeight = computed(() => props.resourceHeight || 40)

const resources = computed(
  () =>
    props.resources || [
      { id: '1', label: 'Resource 1' },
      { id: '2', label: 'Resource 2' },
      { id: '3', label: 'Resource 3' },
    ],
)
// #endregion

// #region Matrix
// #region Grid Dividers
const horizontalLines = computed(() => {
  const lines: Array<number> = []
  for (let i = 0; i < resources.value.length; i++) {
    lines.push((i + 1) * resourceHeight.value)
  }
  return lines
})

const verticalLines = computed(() => {
  const lines: Array<number> = []
  const start = moment(startDate.value).startOf(scale.value.scale)
  const end = moment(endDate.value).endOf(scale.value.scale)
  let current = start.clone()

  while (current.isSameOrBefore(end, scale.value.scale)) {
    const groupStart = current.clone().startOf(scale.value.scale)
    const groupEnd = current
      .clone()
      .add(scale.value.step - 1, scale.value.scale)
      .endOf(scale.value.scale)

    const visibleStart = moment.max(groupStart, moment(startDate.value))
    const visibleEnd = moment.min(groupEnd, moment(endDate.value))

    // Calculate the width based on the visible portion only
    const columnCount = visibleEnd.diff(visibleStart, scale.value.scale, true)
    const width = (columnCount / (scale.value.step || 1)) * headerHeight.value

    // Calculate the left position from the start date (always >= 0)
    const left = Math.max(
      0,
      (groupStart.diff(moment(startDate.value), scale.value.scale, true) /
        (scale.value.step || 1)) *
        headerHeight.value,
    )

    lines.push(left)
    lines.push(left + width)

    current.add(scale.value.step, scale.value.scale)
  }
  return [...new Set(lines)]
})
// #endregion

// #region Resource Dates
const resourceXDates = computed(() => {
  const dates: Array<{
    date: moment.Moment
    resourceId: string
    left: number
    top: number
    width: number
  }> = []

  const start = moment(startDate.value).startOf(scale.value.scale)
  const end = moment(endDate.value).endOf(scale.value.scale)
  let current = start.clone()

  while (current.isSameOrBefore(end, scale.value.scale)) {
    const groupStart = current.clone().startOf(scale.value.scale)
    const groupEnd = current
      .clone()
      .add(scale.value.step - 1, scale.value.scale)
      .endOf(scale.value.scale)

    const visibleStart = moment.max(groupStart, moment(startDate.value))
    const visibleEnd = moment.min(groupEnd, moment(endDate.value))

    // Calculate the width based on the visible portion only
    const columnCount = visibleEnd.diff(visibleStart, scale.value.scale, true)
    const width = (columnCount / (scale.value.step || 1)) * headerHeight.value

    // Calculate the left position from the start date (always >= 0)
    const left = Math.max(
      0,
      (groupStart.diff(moment(startDate.value), scale.value.scale, true) /
        (scale.value.step || 1)) *
        headerHeight.value,
    )

    resources.value.forEach((resource, index) => {
      dates.push({
        date: current.clone(),
        resourceId: resource.id,
        left,
        top: index * resourceHeight.value,
        width,
      })
    })
    current.add(scale.value.step, scale.value.scale)
  }
  return dates
})
// #endregion
// #endregion

// #region Scroll
const scrollY = ref(0)
const scrollX = ref(0)

const timelineHeaderScroll = useTemplateRef('timelineHeaderScroll')
const schedulerBody = useTemplateRef('schedulerBody')

watch(
  () => scrollX.value,
  () => {
    if (timelineHeaderScroll.value) {
      timelineHeaderScroll.value.scrollLeft = scrollX.value
    }
  },
)

function handleBodyScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollY.value = target.scrollTop
  scrollX.value = target.scrollLeft
}

function handleHeaderIntersection(entries: IntersectionObserverEntry[]) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const target = entry.target as HTMLElement
      target.style.insetInlineStart = `${entry.intersectionRect.width}px`
      // target.style.insetInlineEnd = `${entry.intersectionRect.right}px`
    }
  })
}
// #endregion
</script>

<style lang="scss" src="./scheduler.scss"></style>

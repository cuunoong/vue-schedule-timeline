import type moment from "moment";

export interface SchedulerHeader {
  group: moment.unitOfTime.Base;
  format?: string;
}

export interface SchedulerZoomScale {
  scale: moment.unitOfTime.Base;
  step: number;
}

export interface SchedulerResource {
  id: string;
  label: string;
}

import { Job } from './models/job';
import { JobResult } from './models/job-result';

export class CreateJob {
  public static readonly type = '[Job] Create Job';

  constructor(public job: Job, public autoUpdateInterval?: number, public correlationId?: string) { }
}

export class CreateJobSuccess {
  public static readonly type = '[Job] Create Job Success';

  constructor(public job: Job, public correlationId?: string) { }
}

export class CreateJobFail {
  public static readonly type = '[Job] Create Job Fail';

  constructor(public job: Job, public error: any, public correlationId?: string) { }
}

export class StopAutoJobUpdate {
  public static readonly type = '[Job] Stop Auto Job Update';

  constructor(public jobId: string) { }
}

export class CancelJob {
  public static readonly type = '[Job] Cancel Job';

  constructor(public job: Job, public correlationId?: string) { }
}

export class CancelJobSuccess {
  public static readonly type = '[Job] Cancel Job Success';

  constructor(public job: Job, public correlationId?: string) { }
}

export class CancelJobFail {
  public static readonly type = '[Job] Cancel Job Fail';

  constructor(public job: Job, error: any, correlationId?: string) { }
}

export class SelectJob {
  public static readonly type = '[Job] Select Job';

  constructor(public jobId: string) { }

}

export class LoadJobs {
  public static readonly type = '[Job] Load Jobs';

  constructor() { }
}

export class LoadJob {
  public static readonly type = '[Job] Load Job';

  constructor(public id: string) { }
}

export class UpdateJobState {
  public static readonly type = '[Job] Update Job State';

  constructor(public id: string, public correlationId?: string) { }
}

export class UpdateJobSuccess {
  public static readonly type = '[Job] Update Job State Success';

  constructor(public id: string, public correlationId?: string) { }
}

export class UpdateJobFail {
  public static readonly type = '[Job] Update Job State Fail';

  constructor(public id: string, error: any, public correlationId?: string) { }
}

export class UpdateJobResult {
  public static readonly type = '[Job] Update Job Result';
  constructor(public id: string, public correlationId?: string) { }
}

export class UpdateJobResultSuccess {
  public static readonly type = '[Job] Update Job Result Success';

  constructor(public id: string, public correlationId?: string) { }
}

export class UpdateJobResultFail {
  public static readonly type = '[Job] Update Job Result Fail';

  constructor(public id: string, error: any, public correlationId?: string) { }
}

export class JobCompleted {
  public static readonly type = '[Job] Job Completed';

  constructor(public id: string, public result: JobResult, public correlationId?: string) { }
}

export class JobFailed {
  public static readonly type = '[Job] Job Failed';

  constructor(public id: string, public error: any, public correlationId?: string) { }
}

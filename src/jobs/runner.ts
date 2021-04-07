/**
 *  Batch runner and interfaces
 * 
 *  Defines the batch job interface and will run all the jobs 
 *  in this folder   
 * 
 * @file   Message sent event handler
 * @author Andrew Everman.
 * @since  25.2.2021
 */

import schedule from 'node-schedule'
import { getJobFiles } from '../util/fiileUtil'

export interface BatchJob {
    rule: schedule.RecurrenceRule | string
    function: schedule.JobCallback
}

export function runJobs() {
    const jobFiles = getJobFiles()

    if (jobFiles)
        jobFiles.forEach((job) => {
            const jobObj: BatchJob = require(job).default
            schedule.scheduleJob(jobObj.rule, jobObj.function)
        })
}

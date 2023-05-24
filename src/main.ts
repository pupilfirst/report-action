/* eslint-disable no-console */
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'

import {GraphQLClient, gql} from 'graphql-request'

const endpoint: string = process.env.REVIEW_END_POINT || ''

const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${process.env.REVIEW_BOT_USER_TOKEN}`
  }
})

const completedSubmissionReportQuery = gql`
  mutation CompletedSubmissionReport(
    $submissionId: ID!
    $report: String
    $status: SubmissionReportStatus!
    $reporter: String!
    $heading: String
  ) {
    concludeSubmissionReport(
      submissionId: $submissionId
      report: $report
      status: $status
      reporter: $reporter
      heading: $heading
    ) {
      success
    }
  }
`

const inProgressSubmissionReportQuery = gql`
  mutation InProgressSubmissionReport(
    $submissionId: ID!
    $report: String
    $reporter: String!
    $heading: String
  ) {
    beginProcessingSubmissionReport(
      submissionId: $submissionId
      report: $report
      reporter: $reporter
      heading: $heading
    ) {
      success
    }
  }
`

const queuedSubmissionReportQuery = gql`
  mutation QueuedSubmissionReport(
    $submissionId: ID!
    $report: String
    $reporter: String!
    $heading: String
  ) {
    queueSubmissionReport(
      submissionId: $submissionId
      report: $report
      reporter: $reporter
      heading: $heading
    ) {
      success
    }
  }
`

let submissionData: {
  id: string
}

try {
  submissionData = JSON.parse(
    fs.readFileSync(
      path.join(process.env.GITHUB_WORKSPACE || '', 'submission.json'),
      {encoding: 'utf-8'}
    )
  )
} catch (error) {
  throw error
}

const reportFilePath: string = core.getInput('report_file_path')

const statusInput: string = core.getInput('status')

const descriptionInput: string = core.getInput('description')

let reportDescription: string

interface ReportData {
  grading: string
  report: string
  status: string
}

let reportDataFromFile: ReportData | undefined

if (reportFilePath !== '') {
  try {
    reportDataFromFile = JSON.parse(
      fs.readFileSync(
        path.join(process.env.GITHUB_WORKSPACE || '', reportFilePath),
        {encoding: 'utf-8'}
      )
    )
  } catch (error) {
    throw error
  }
}

const reportIfGraded = (reportData: ReportData): string => {
  const grading: string = reportData.grading

  const report: string =
    grading === 'reject'
      ? 'Submission will be eventually rejected and feedback will be shared.'
      : ''

  return report
}

const truncateReport = (reportText: string): string => {
  if (typeof reportText !== 'string') {
    return reportText
  }

  if (reportText.length > 10000) {
    return `Report has been truncated because it was longer than 10,000 chars:\n\n---\n\n${reportText.substring(
      0,
      9900
    )}`
  } else {
    return reportText
  }
}

let reportStatus: string = statusInput

if (reportDataFromFile !== undefined) {
  reportStatus = reportDataFromFile.status
  reportDescription =
    truncateReport(reportDataFromFile.report) ||
    descriptionInput ||
    reportIfGraded(reportDataFromFile) ||
    'Test report unavailable'
} else {
  reportDescription = descriptionInput || 'Test report unavailable'
}

interface ReportVariables {
  submissionId: string
  report: string
  status: string
  reporter: string
  heading?: string
  [key: string]: string | undefined
}

const variables: ReportVariables = {
  submissionId: submissionData.id,
  report: reportDescription,
  status: reportStatus,
  reporter: 'Virtual Teaching Assistant'
}

let mutation: {query: string; variables: ReportVariables}
export async function run(): Promise<void> {
  switch (statusInput) {
    case 'queued':
      mutation = {
        query: queuedSubmissionReportQuery,
        variables: {
          ...variables,
          heading: 'Automated tests are queued'
        }
      }
      break
    case 'in_progress':
      mutation = {
        query: inProgressSubmissionReportQuery,
        variables: {
          ...variables,
          heading: 'Automated tests are in progress'
        }
      }
      break
    case 'error':
      mutation = {
        query: completedSubmissionReportQuery,
        variables: {
          ...variables,
          heading: 'Automated tests passed',
          status: 'error'
        }
      }
      break
    case 'failure':
      mutation = {
        query: completedSubmissionReportQuery,
        variables: {
          ...variables,
          heading: 'Automated tests failed',
          status: 'failure'
        }
      }
      break
    case 'success':
      mutation = {
        query: completedSubmissionReportQuery,
        variables: {
          ...variables,
          heading: 'Automated tests passed',
          status: 'success'
        }
      }
      break
    default:
      throw new Error('Invalid submission report status')
  }

  const data = await graphQLClient.request(mutation.query, mutation.variables)
  console.log(JSON.stringify(data, undefined, 2))
}

const testMode: boolean = core.getBooleanInput('test_mode')

if (testMode) {
  console.log(reportDataFromFile)
  console.log(submissionData)
} else {
  console.log(reportDataFromFile)
  ;(async () => {
    try {
      await run()
      console.log('Execution Completed.')
    } catch (error) {
      console.log(error)
    }
  })()
}

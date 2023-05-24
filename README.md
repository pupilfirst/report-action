<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Pupilfirst Report Action

The reporting action accepts three inputs - `report_file_path`, `status` and `description` . The `status` and `description` is specifically useful to report to the LMS that a test has begun in the automated system. The action expects the `REVIEW_END_POINT` and `REVIEW_BOT_USER_TOKEN` as env , the first being the GraphQL API endpoint of your school and the latter being the user token for the user created for bot actions. It is recommended to keep both of these as secrets. Here is a basic example:

```yaml
# Using the reporting action with status and description supplied as input.
- name: Report to LMS tests in progress
  uses: pupilfirstr/actions/reporting@v1
  with:
    # Valid status inputs are pending, success, failure, error.
    status: 'pending'
    description: 'The automated tests are in progress'
  env:
    # GraphQL API endpoint for your school in the LMS.
    REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }}
    # User API token of the review bot user.
    REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }}
```

In the absence of `status` and `description` inputs to the action, the action expects a `report.json` file in the checked out repository to complete the reporting. The `report_file_path` should be supplied accurately - which is the relative path to the file in the checked out repository. The `report.json` should have the keys `report` which stores the report description and `status` which stores the status to be reported. In the absence of a valid `report.json` or inputs directly to the action, an error will be reported to the LMS. Ensure that your automated tests generate a `report.json` output with the said keys before the reporting step. Here is an example of using the action without `status` and `description` input:

```yaml
# Using the reporting action without status and description supplied as input.
- name: Report to LMS tests in progress
  uses: pupilfirstr/actions/reporting@v1
  with:
    # File path when the report.json is in submission directory in the checked out repo.
    report_file_path: 'submission/report.json'
  env:
    # GraphQL API endpoint for your school in the LMS.
    REVIEW_END_POINT: ${{ secrets.REVIEW_END_POINT }}
    # User API token of the review bot user.
    REVIEW_BOT_USER_TOKEN: ${{ secrets.REVIEW_BOT_USER_TOKEN }}
```

In the presence of `status` and `description` inputs to the action, the values in `report.json` will be ignored if present.

## How to build and release

When releasing a new version, you should always push two tags - the full version tag - `v1.2.3` for example, and the corresponding major version tag - `v1`, for `v1.2.3`. You will need to delete the existing major version tag, and push a replacement tag for each release.

```bash
# Build the action.
npm run all

# Delete the old local tag, and create it anew.
git tag -d v1
git tag v1
git tag v1.2.3

# Delete the old tag on origin before pushing updated ones.
git push origin :refs/tags/v1
git push origin v1
git push origin v1.2.3
```

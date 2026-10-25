#!/usr/bin/env node
// Prepares a release (version bump, changelog, "upgrade to <version>" commit) and publishes it
// by pushing master and creating the GitHub release, which starts .github/workflows/publish.yml.
// Requires an authenticated `gh` CLI.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = 'plhery/node-twitter-api-v2';
const BRANCH = 'master';
const USAGE = `Usage:
  node release.mjs <major|minor|patch> --dry-run   Show the next version and its changelog entries
  node release.mjs <major|minor|patch>             Prepare the release commit
  node release.mjs --publish                       Publish the prepared release commit
  node release.mjs <major|minor|patch> --publish   Both`;

function run(cmd, args, { inherit = false } = {}) {
  const output = execFileSync(cmd, args, { encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe' });
  return output?.trim() ?? '';
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const bumps = args.filter(arg => ['major', 'minor', 'patch'].includes(arg));
const bump = bumps[0];
const dryRun = args.includes('--dry-run');
const publish = args.includes('--publish');
const knownArgs = ['major', 'minor', 'patch', '--dry-run', '--publish'];

if (args.some(arg => !knownArgs.includes(arg)) || bumps.length > 1 || (!bump && !publish) || (dryRun && (publish || !bump))) {
  fail(USAGE);
}

function readVersion() {
  return JSON.parse(readFileSync('package.json', 'utf8')).version;
}

function nextVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Fails (or only warns, for a dry run) when the repository is not ready to be released. */
function checkRepository({ inSyncWithOrigin }) {
  run('git', ['fetch', '--quiet', '--tags', 'origin', BRANCH]);

  const problems = [];
  if (run('git', ['branch', '--show-current']) !== BRANCH) {
    problems.push(`Releases are made from ${BRANCH}.`);
  }
  if (run('git', ['status', '--porcelain'])) {
    problems.push('The working tree is not clean.');
  }
  if (inSyncWithOrigin && run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', `origin/${BRANCH}`])) {
    problems.push(`${BRANCH} is not in sync with origin/${BRANCH}.`);
  }

  if (problems.length && dryRun) {
    console.warn(problems.map(problem => `Warning: ${problem}`).join('\n') + '\n');
  } else if (problems.length) {
    fail(problems.join('\n'));
  }
}

/** The pull request a commit was merged with (squash, rebase or merge commit), if any. */
function findMergedPullRequest(sha) {
  const pulls = JSON.parse(run('gh', ['api', `repos/${REPO}/commits/${sha}/pulls`]));
  return pulls.find(pull => pull.merged_at && pull.base.ref === BRANCH);
}

function prepare() {
  checkRepository({ inSyncWithOrigin: true });

  const latestTag = run('git', ['describe', '--tags', '--abbrev=0']);
  const commits = run('git', ['log', `${latestTag}..HEAD`, '--no-merges', '--pretty=format:%H %s'])
    .split('\n')
    .filter(Boolean);

  // Only merged pull requests make it to the changelog, commits pushed directly to master are left out
  const entries = [];
  const skipped = [];
  for (const commit of commits) {
    const [sha, ...subject] = commit.split(' ');
    const description = subject.join(' ').replace(/ \(#\d+\)$/, '');
    const pull = findMergedPullRequest(sha);

    if (pull) {
      entries.push(`- ${description} #${pull.number} (@${pull.user.login})`);
    } else {
      skipped.push(`  ${sha.slice(0, 7)} ${description}`);
    }
  }

  const currentVersion = readVersion();
  const version = nextVersion(currentVersion);
  const notes = entries.join('\n');

  console.log(`${currentVersion} -> ${version}\n\n${notes || '(no entries)'}\n`);
  if (skipped.length) {
    console.log(`Not in the changelog (no merged pull request):\n${skipped.join('\n')}\n`);
  }

  if (!entries.length) fail(`No merged pull request since ${latestTag}.`);
  if (run('git', ['tag', '--list', version])) fail(`Tag ${version} already exists.`);
  if (dryRun) return;

  run('npm', ['run', 'lint'], { inherit: true });
  run('npm', ['run', 'build'], { inherit: true });

  // Updates package.json and package-lock.json
  run('npm', ['version', version, '--no-git-tag-version']);
  writeFileSync('changelog.md', `${version}\n------\n${notes}\n\n${readFileSync('changelog.md', 'utf8')}`);

  run('git', ['add', 'package.json', 'package-lock.json', 'changelog.md']);
  run('git', ['commit', '--quiet', '-m', `upgrade to ${version}`]);
  console.log(`Committed "upgrade to ${version}".`);
}

/** Changelog entries of the latest version, used as the GitHub release notes. */
function readReleaseNotes(version) {
  const [header, separator, ...entries] = readFileSync('changelog.md', 'utf8').split('\n\n')[0].split('\n');

  if (header !== version || !separator.startsWith('---')) {
    fail(`changelog.md does not start with the ${version} entries.`);
  }
  return entries.join('\n');
}

function publishRelease() {
  checkRepository({ inSyncWithOrigin: false });

  const version = readVersion();
  if (run('git', ['log', '-1', '--pretty=%s']) !== `upgrade to ${version}`) {
    fail(`The last commit is not "upgrade to ${version}": prepare the release first.`);
  }
  if (run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${version}`])) {
    fail(`Tag ${version} already exists on origin.`);
  }

  const notes = readReleaseNotes(version);
  const sha = run('git', ['rev-parse', 'HEAD']);

  run('git', ['push', 'origin', BRANCH], { inherit: true });
  // Creating the release (and its tag) starts the npm publish workflow
  run('gh', ['release', 'create', version, '--repo', REPO, '--target', sha, '--title', version, '--notes', notes], { inherit: true });

  console.log(`Released ${version}. The npm publish workflow is starting: gh run list --repo ${REPO} --workflow publish.yml`);
}

if (bump) prepare();
if (publish) publishRelease();

# Upload the Tech Maths website to GitHub Desktop

The website project lives in the online workspace, not on your laptop. This clean source package is how to transfer it to your computer and publish it with GitHub Desktop.

## Steps

1. Download `Tech-Maths-GitHub-Source.zip` from this chat.
2. In Windows File Explorer, right-click it and choose **Extract All**. Keep the extracted `techmaths` folder somewhere easy to find, such as Documents.
3. Open **GitHub Desktop** and sign in to your GitHub account.
4. Choose **File → Add Local Repository…** and select the extracted `techmaths` folder.
5. If GitHub Desktop says it is not a repository and offers to create one there, choose **Create a repository**. If it does not offer that option, choose **File → New repository…**, set the local path to the extracted folder, and create it there.
6. Review the changed-files list. The package intentionally excludes `.env.local`, the local database and installed packages. Do not add those secrets/data files to GitHub.
7. In the summary box, enter `Update Tech Maths website details and careers`, then click **Commit to main** (or the button showing your current branch).
8. Click **Publish repository**. Choose a repository name such as `techmaths-website`; select **Keep this code private** unless you specifically want the source code public; then click **Publish repository**.

## Important

- Publishing source code to GitHub does **not** automatically update `techmaths-dc.com`. That site is currently hosted separately; it needs a deployment configured from the GitHub repository.
- The package has no local admin password or live customer data. It contains `.env.example` with safe placeholders.
- The preview password `ADMIN` is weak. Before deploying a live site, change it to a long, private passphrase. Never commit `.env.local` or share a password/access token in chat.
- For future website changes, tell the assistant in plain language. The assistant can update the workspace project and provide a fresh source package; GitHub Desktop on your laptop does not automatically sync with the online workspace.

# Contributing to OpenHR India

Thanks for your interest! This project needs both **code** and **domain expertise** (HR, payroll, tax, labour law).

## Ways to help

- **Report bugs or request features** — open an issue with clear steps or a use case.
- **Share compliance knowledge** — state-wise PT slabs, LWF rates, leave rules, filing formats. Please cite the official source (notification, circular, government portal).
- **Write code** — pick an issue labelled `good first issue` or `help wanted` and comment that you're working on it.
- **Improve docs** — setup guides, explanations of Indian payroll concepts, translations.

## Workflow

1. Fork the repo and create a branch: `git checkout -b feat/short-description`
2. Make focused changes with clear commit messages.
3. Add or update tests for any calculation logic — payroll and tax code must be tested.
4. Open a pull request describing what changed and why, and link the related issue.

## Guidelines

- Keep statutory rates and rules in configuration/data, not hard-coded, and tag them with the financial year or effective date.
- Never commit real employee data, PAN, Aadhaar or bank details — use obviously fake test data.
- Be respectful; see the [Code of Conduct](CODE_OF_CONDUCT.md).

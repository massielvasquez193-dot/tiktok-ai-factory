# Client User Guide

## Main Workflow

1. Open the dashboard at `http://localhost:3000`.
2. Add products in Product Manager.
3. Generate scripts from the Scripts page.
4. Generate storyboards.
5. Generate prompts.
6. Submit video generation tasks from Video Generator or Provider pages.
7. Review generated videos in Video Library / Queue.
8. Use Publishing pages for publishing workflow preparation.

## Notes

- Without `SEEDANCE_API_KEY`, video generation runs in mock/degraded mode.
- Without `OPENAI_API_KEY`, analysis and true LLM script generation are limited.
- Docker production mode requires WSL2 on Windows.

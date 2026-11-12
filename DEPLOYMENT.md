# Deployment outline

- Frontend: deploy `frontend/` to Vercel or Netlify; set `VITE_API_URL` to the deployed Express API URL.
- Backend: deploy `backend/` to Render, Railway or another Node host; set `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `AI_SERVICE_URL`.
- AI service: deploy `ai-engine/` as a Python web service with start command `uvicorn main:app --host 0.0.0.0 --port $PORT`; set `OPENAI_API_KEY` and `LLM_MODEL` if live LLM letters are required. Set backend `AI_SERVICE_URL` to this service URL.
- Configure HTTPS and exact CORS origins. Do not expose MongoDB credentials or LLM keys in frontend variables.

The project is a runnable implementation scaffold, not a deployed production service. Configure credentials, hosting, email verification, password reset, monitoring, backups, privacy policy and security review before inviting real users.

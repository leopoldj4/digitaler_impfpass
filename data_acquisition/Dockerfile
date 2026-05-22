FROM python:3.12-slim

WORKDIR /app

COPY requirements-web.txt /app/requirements-web.txt
RUN pip install --no-cache-dir -r /app/requirements-web.txt

COPY gemma_bbox_core.py /app/gemma_bbox_core.py
COPY gemma_bbox_web.py /app/gemma_bbox_web.py
COPY vaccines.json /app/vaccines.json

EXPOSE 8000

CMD ["python", "gemma_bbox_web.py", "--host", "0.0.0.0", "--port", "8000", "--db-json", "/app/vaccines.json"]

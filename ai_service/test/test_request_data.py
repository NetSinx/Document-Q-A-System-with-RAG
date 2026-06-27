from litestar.testing import AsyncTestClient
from app.main import app
from io import BytesIO
from litestar import Litestar
from collections.abc import AsyncIterator
import pytest

app.debug = True

@pytest.fixture(scope="function")
async def test_client() -> AsyncIterator[AsyncTestClient[Litestar]]:
    async with AsyncTestClient(app=app) as client:
        yield client

async def test_request_data() -> None:
    async with AsyncTestClient(app=app) as client:
        response = await client.post(
            "/api/chat",
            files={"file": ("filename", BytesIO(b"file content"))},
            data={"query": "Hello World"},
        )
        assert response.status_code == 201
        assert response.json() == {
            "query": "Hello World",
            "document_name": "filename",
            "size": len(b"file content"),
        }
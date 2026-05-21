use actix_web::{
    App, HttpRequest, HttpResponse, HttpServer, Responder, get, http::header, post, web,
};
use base64::{Engine, prelude::BASE64_STANDARD};
use rig_core::{
    OneOrMany,
    client::CompletionClient,
    completion::{
        TypedPrompt,
        message::{ImageDetail, ImageMediaType, MimeType, UserContent},
    },
    providers::openai,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::env;
use utoipa::{OpenApi, ToSchema};

const MAX_IMAGE_UPLOAD_BYTES: usize = 25 * 1024 * 1024;

#[derive(OpenApi)]
#[openapi(
    paths(hello, extract_image, openapi_spec),
    components(schemas(ExtractionResponse, Vaccination, ImageUpload, ErrorResponse))
)]
struct ApiDoc;

#[derive(Deserialize, JsonSchema, Serialize, ToSchema)]
struct ExtractionResponse {
    first_name: Option<String>,
    last_name: Option<String>,
    birth_date: Option<String>,
    birth_place: Option<String>,
    vaccinations: Option<Vec<Vaccination>>,
}

#[derive(Deserialize, JsonSchema, Serialize, ToSchema)]
struct Vaccination {
    date: Option<String>,
    name: Option<String>,
}

#[derive(Serialize, ToSchema)]
struct ErrorResponse {
    error: String,
}

#[derive(ToSchema)]
#[schema(value_type = String, format = Binary)]
#[allow(dead_code)]
struct ImageUpload(Vec<u8>);

struct LlamaCppConfig {
    base_url: String,
    model: String,
    api_key: String,
}

impl LlamaCppConfig {
    fn from_env() -> Result<Self, String> {
        let base_url = env::var("LLAMA_CPP_BASE_URL")
            .map_err(|_| "LLAMA_CPP_BASE_URL must be set to the llama.cpp OpenAI-compatible base URL, for example http://127.0.0.1:8081/v1".to_string())?;
        let model = env::var("LLAMA_CPP_MODEL").unwrap_or_else(|_| "local".to_string());
        let api_key = env::var("LLAMA_CPP_API_KEY").unwrap_or_else(|_| "llama.cpp".to_string());

        Ok(Self {
            base_url,
            model,
            api_key,
        })
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());

    HttpServer::new(|| {
        App::new()
            .app_data(web::PayloadConfig::new(MAX_IMAGE_UPLOAD_BYTES))
            .service(hello)
            .service(extract_image)
            .service(openapi_spec)
    })
    .bind(bind_addr)?
    .run()
    .await
}

#[utoipa::path(
    get,
    path = "/",
    responses(
        (status = 200, description = "Health check response.", body = String)
    )
)]
#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[utoipa::path(
    post,
    path = "/extract",
    request_body(
        content = ImageUpload,
        description = "Raw image bytes to extract vaccination data from.",
        content_type = "image/*"
    ),
    responses(
        (status = 200, description = "Extracted vaccination data.", body = ExtractionResponse),
        (status = 400, description = "Invalid image upload.", body = ErrorResponse),
        (status = 500, description = "Extraction failed.", body = ErrorResponse)
    )
)]
#[post("/extract")]
async fn extract_image(req: HttpRequest, image: web::Bytes) -> impl Responder {
    if image.is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "image body must not be empty".to_string(),
        });
    }

    match extract_vaccination_data(&req, image).await {
        Ok(extraction) => HttpResponse::Ok().json(extraction),
        Err(error) => HttpResponse::InternalServerError().json(ErrorResponse { error }),
    }
}

async fn extract_vaccination_data(
    req: &HttpRequest,
    image: web::Bytes,
) -> Result<ExtractionResponse, String> {
    let config = LlamaCppConfig::from_env()?;
    let client = openai::CompletionsClient::builder()
        .base_url(&config.base_url)
        .api_key(&config.api_key)
        .build()
        .map_err(|err| format!("failed to configure llama.cpp client: {err}"))?;
    let agent = client
        .agent(&config.model)
        .preamble("You extract vaccination passport data from images. Return only data visible in the image. Leave unknown fields null.")
        .max_tokens(1024)
        .build();

    let mut content = OneOrMany::one(UserContent::text(
        "Extract the person's first name, last name, birth date, birth place, and vaccinations from this image.",
    ));
    content.push(UserContent::image_base64(
        BASE64_STANDARD.encode(image),
        image_media_type(req),
        Some(ImageDetail::Auto),
    ));

    agent
        .prompt_typed::<ExtractionResponse>(content)
        .await
        .map_err(|err| format!("llama.cpp extraction failed: {err}"))
}

fn image_media_type(req: &HttpRequest) -> Option<ImageMediaType> {
    req.headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|content_type| content_type.split(';').next())
        .and_then(|content_type| ImageMediaType::from_mime_type(content_type.trim()))
}

#[utoipa::path(
    get,
    path = "/openapi.json",
    responses(
        (status = 200, description = "OpenAPI specification for the extractor API.")
    )
)]
#[get("/openapi.json")]
async fn openapi_spec() -> impl Responder {
    HttpResponse::Ok().json(ApiDoc::openapi())
}

use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};

#[derive(OpenApi)]
#[openapi(
    paths(hello, extract_image, openapi_spec),
    components(schemas(ExtractionResponse, Vaccination, ImageUpload))
)]
struct ApiDoc;

#[derive(Deserialize, Serialize, ToSchema)]
struct ExtractionResponse {
    first_name: Option<String>,
    last_name: Option<String>,
    birth_date: Option<String>,
    birth_place: Option<String>,
    vaccinations: Option<Vec<Vaccination>>,
}

#[derive(Deserialize, Serialize, ToSchema)]
struct Vaccination {
    date: Option<String>,
    name: Option<String>,
}

#[derive(ToSchema)]
#[schema(value_type = String, format = Binary)]
#[allow(dead_code)]
struct ImageUpload(Vec<u8>);

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(hello)
            .service(extract_image)
            .service(openapi_spec)
    })
    .bind(("127.0.0.1", 8080))?
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
        (status = 200, description = "Extracted vaccination data.", body = ExtractionResponse)
    )
)]
#[post("/extract")]
async fn extract_image(_image: web::Bytes) -> impl Responder {
    HttpResponse::Ok().json(ExtractionResponse {
        first_name: None,
        last_name: None,
        birth_date: None,
        birth_place: None,
        vaccinations: None,
    })
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

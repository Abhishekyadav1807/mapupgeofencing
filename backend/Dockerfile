# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o geofencing-server main.go

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /app/geofencing-server .

ENV PORT=8080
ENV DB_PATH=/data/geofencing.db

EXPOSE 8080

CMD ["./geofencing-server"]

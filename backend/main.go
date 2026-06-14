package main

import (
	"log"
	"os"

	"geofencing-system/database"
	"geofencing-system/handlers"
	"geofencing-system/services"
	"geofencing-system/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	db := database.Connect()

	geofenceSvc := services.NewGeofenceService(db)
	vehicleSvc := services.NewVehicleService(db)
	alertSvc := services.NewAlertService(db)
	violationSvc := services.NewViolationService(db)

	wsHub := websocket.NewHub()
	go wsHub.Run()

	locationSvc := services.NewLocationService(
		db,
		geofenceSvc,
		vehicleSvc,
		alertSvc,
		violationSvc,
		wsHub,
	)

	handler := handlers.NewHandler(
		geofenceSvc,
		vehicleSvc,
		locationSvc,
		alertSvc,
		violationSvc,
		wsHub,
	)

	r := gin.Default()
	handler.RegisterRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("MapUp Geofencing API listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

package handlers

import (
	"net/http"
	"strconv"
	"time"

	"geofencing-system/models"
	"geofencing-system/services"
	ws "geofencing-system/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type APIResponse struct {
	TimeNs int64       `json:"time_ns"`
	Data   interface{} `json:"data,omitempty"`
	Error  string      `json:"error,omitempty"`
}

type Handler struct {
	db           *gorm.DB
	geofenceSvc  *services.GeofenceService
	vehicleSvc   *services.VehicleService
	locationSvc  *services.LocationService
	alertSvc     *services.AlertService
	violationSvc *services.ViolationService
	wsHub        *ws.Hub
}

func NewHandler(
	db *gorm.DB,
	geofenceSvc *services.GeofenceService,
	vehicleSvc *services.VehicleService,
	locationSvc *services.LocationService,
	alertSvc *services.AlertService,
	violationSvc *services.ViolationService,
	wsHub *ws.Hub,
) *Handler {
	return &Handler{
		db:           db,
		geofenceSvc:  geofenceSvc,
		vehicleSvc:   vehicleSvc,
		locationSvc:  locationSvc,
		alertSvc:     alertSvc,
		violationSvc: violationSvc,
		wsHub:        wsHub,
	}
}

const requestStartKey = "request_start"

func RequestTimingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Set(requestStartKey, &start)
		c.Next()
	}
}

func requestDurationNs(c *gin.Context) int64 {
	startVal, ok := c.Get(requestStartKey)
	if !ok {
		return 0
	}
	startPtr, ok := startVal.(*time.Time)
	if !ok || startPtr == nil {
		return 0
	}
	return time.Since(*startPtr).Nanoseconds()
}

func respond(c *gin.Context, status int, data interface{}) {
	c.JSON(status, APIResponse{
		TimeNs: requestDurationNs(c),
		Data:   data,
	})
}

func respondError(c *gin.Context, status int, message string) {
	c.JSON(status, APIResponse{
		TimeNs: requestDurationNs(c),
		Error:  message,
	})
}

type createGeofenceRequest struct {
	Name    string         `json:"name" binding:"required"`
	Polygon []models.Point `json:"polygon" binding:"required"`
}

func (h *Handler) CreateGeofence(c *gin.Context) {
	var req createGeofenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	geofence, err := h.geofenceSvc.Create(req.Name, req.Polygon)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	respond(c, http.StatusCreated, geofence)
}

func (h *Handler) ListGeofences(c *gin.Context) {
	geofences, err := h.geofenceSvc.List()
	if err != nil {
		respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respond(c, http.StatusOK, geofences)
}

type createVehicleRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *Handler) CreateVehicle(c *gin.Context) {
	var req createVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	vehicle, err := h.vehicleSvc.Create(req.Name)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	respond(c, http.StatusCreated, vehicle)
}

func (h *Handler) ListVehicles(c *gin.Context) {
	vehicles, err := h.vehicleSvc.List()
	if err != nil {
		respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respond(c, http.StatusOK, vehicles)
}

type recordLocationRequest struct {
	VehicleID *uint    `json:"vehicle_id" binding:"required"`
	Lat       *float64 `json:"lat" binding:"required"`
	Lng       *float64 `json:"lng" binding:"required"`
}

func (h *Handler) RecordLocation(c *gin.Context) {
	var req recordLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	location, events, err := h.locationSvc.RecordLocation(*req.VehicleID, *req.Lat, *req.Lng)
	if err != nil {
		status := http.StatusBadRequest
		if err == services.ErrVehicleNotFound {
			status = http.StatusNotFound
		}
		respondError(c, status, err.Error())
		return
	}

	respond(c, http.StatusOK, gin.H{
		"location": location,
		"alerts":   events,
	})
}

func (h *Handler) GetVehicleLocations(c *gin.Context) {
	vehicleID, err := strconv.ParseUint(c.Param("vehicle_id"), 10, 64)
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid vehicle_id")
		return
	}

	locations, err := h.locationSvc.GetVehicleLocations(uint(vehicleID))
	if err != nil {
		status := http.StatusBadRequest
		if err == services.ErrVehicleNotFound {
			status = http.StatusNotFound
		}
		respondError(c, status, err.Error())
		return
	}

	respond(c, http.StatusOK, locations)
}

type configureAlertRequest struct {
	GeofenceID uint   `json:"geofence_id" binding:"required"`
	VehicleID  *uint  `json:"vehicle_id"`
	AlertType  string `json:"alert_type" binding:"required"`
	Enabled    *bool  `json:"enabled"`
}

func (h *Handler) ConfigureAlert(c *gin.Context) {
	var req configureAlertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	config, err := h.alertSvc.Configure(req.GeofenceID, req.VehicleID, req.AlertType, enabled)
	if err != nil {
		status := http.StatusBadRequest
		if err == services.ErrGeofenceNotFound || err == services.ErrVehicleNotFound {
			status = http.StatusNotFound
		}
		respondError(c, status, err.Error())
		return
	}

	respond(c, http.StatusCreated, config)
}

func (h *Handler) ListAlerts(c *gin.Context) {
	configs, err := h.alertSvc.List()
	if err != nil {
		respondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respond(c, http.StatusOK, configs)
}

func (h *Handler) ViolationHistory(c *gin.Context) {
	var geofenceID, vehicleID *uint

	if val := c.Query("geofence_id"); val != "" {
		id, err := strconv.ParseUint(val, 10, 64)
		if err != nil {
			respondError(c, http.StatusBadRequest, "invalid geofence_id")
			return
		}
		parsed := uint(id)
		geofenceID = &parsed
	}

	if val := c.Query("vehicle_id"); val != "" {
		id, err := strconv.ParseUint(val, 10, 64)
		if err != nil {
			respondError(c, http.StatusBadRequest, "invalid vehicle_id")
			return
		}
		parsed := uint(id)
		vehicleID = &parsed
	}

	limit := 100
	if val := c.Query("limit"); val != "" {
		parsed, err := strconv.Atoi(val)
		if err != nil {
			respondError(c, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = parsed
	}

	violations, err := h.violationSvc.History(geofenceID, vehicleID, limit)
	if err != nil {
		respondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	respond(c, http.StatusOK, violations)
}

func (h *Handler) WebSocketAlerts(c *gin.Context) {
	ws.ServeAlerts(h.wsHub, c.Writer, c.Request)
}

func (h *Handler) SeedDatabase(c *gin.Context) {
	// 1. Wipe all tables
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Violation{})
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Location{})
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.VehicleGeofenceState{})
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.AlertConfig{})
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Vehicle{})
	h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Geofence{})

	// Reset sqlite autoincrement sequence
	h.db.Exec("DELETE FROM sqlite_sequence")

	// 2. Insert Geofences
	gf1 := &models.Geofence{Name: "Cubbon Park Green Zone"}
	_ = gf1.SetPolygon([]models.Point{
		{Lat: 12.9785, Lng: 77.5905},
		{Lat: 12.9790, Lng: 77.5985},
		{Lat: 12.9720, Lng: 77.5995},
		{Lat: 12.9705, Lng: 77.5925},
	})

	gf2 := &models.Geofence{Name: "Indiranagar Commercial Corridor"}
	_ = gf2.SetPolygon([]models.Point{
		{Lat: 12.9780, Lng: 77.6380},
		{Lat: 12.9790, Lng: 77.6480},
		{Lat: 12.9680, Lng: 77.6490},
		{Lat: 12.9670, Lng: 77.6390},
	})

	gf3 := &models.Geofence{Name: "Hebbal IT Highway"}
	_ = gf3.SetPolygon([]models.Point{
		{Lat: 13.0450, Lng: 77.5850},
		{Lat: 13.0460, Lng: 77.5990},
		{Lat: 13.0330, Lng: 77.6000},
		{Lat: 13.0320, Lng: 77.5860},
	})

	if err := h.db.Create(gf1).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create geofence 1: "+err.Error())
		return
	}
	if err := h.db.Create(gf2).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create geofence 2: "+err.Error())
		return
	}
	if err := h.db.Create(gf3).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create geofence 3: "+err.Error())
		return
	}

	// 3. Insert Vehicles
	v1 := &models.Vehicle{Name: "Truck-001"}
	v2 := &models.Vehicle{Name: "Delivery-Van-42"}
	v3 := &models.Vehicle{Name: "Cargo-Hauler-X"}

	if err := h.db.Create(v1).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create vehicle 1: "+err.Error())
		return
	}
	if err := h.db.Create(v2).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create vehicle 2: "+err.Error())
		return
	}
	if err := h.db.Create(v3).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "failed to create vehicle 3: "+err.Error())
		return
	}

	// 4. Configure Alert Rules
	_, _ = h.alertSvc.Configure(gf1.ID, nil, "both", true)
	_, _ = h.alertSvc.Configure(gf2.ID, nil, "both", true)
	_, _ = h.alertSvc.Configure(gf3.ID, nil, "both", true)

	// 5. Seed initial location history
	_, _, _ = h.locationSvc.RecordLocation(v1.ID, 12.9750, 77.5850)
	_, _, _ = h.locationSvc.RecordLocation(v1.ID, 12.9750, 77.5880)

	_, _, _ = h.locationSvc.RecordLocation(v2.ID, 12.9850, 77.6430)
	_, _, _ = h.locationSvc.RecordLocation(v2.ID, 12.9810, 77.6430)

	_, _, _ = h.locationSvc.RecordLocation(v3.ID, 13.0380, 77.5920)
	_, _, _ = h.locationSvc.RecordLocation(v3.ID, 13.0380, 77.5890)

	respond(c, http.StatusOK, gin.H{
		"message":   "Database seeded successfully with 3 geofences, 3 vehicles, default alert rules, and starting path history.",
		"geofences": []uint{gf1.ID, gf2.ID, gf3.ID},
		"vehicles":  []uint{v1.ID, v2.ID, v3.ID},
	})
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.Use(CORSMiddleware())
	r.Use(RequestTimingMiddleware())

	r.POST("/seed", h.SeedDatabase)

	r.POST("/geofences", h.CreateGeofence)
	r.GET("/geofences", h.ListGeofences)

	r.POST("/vehicles", h.CreateVehicle)
	r.GET("/vehicles", h.ListVehicles)

	r.POST("/vehicles/location", h.RecordLocation)
	r.GET("/vehicles/location/:vehicle_id", h.GetVehicleLocations)

	r.POST("/alerts/configure", h.ConfigureAlert)
	r.GET("/alerts", h.ListAlerts)

	r.GET("/violations/history", h.ViolationHistory)

	r.GET("/ws/alerts", h.WebSocketAlerts)
}

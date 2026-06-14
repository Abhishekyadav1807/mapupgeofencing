package services

import (
	"errors"
	"fmt"
	"math"

	"geofencing-system/models"
)

var (
	ErrInvalidPolygon       = errors.New("polygon must have at least 3 distinct vertices")
	ErrInvalidCoordinates   = errors.New("coordinates must have lat in [-90, 90] and lng in [-180, 180]")
	ErrDegeneratePolygon    = errors.New("polygon has zero or near-zero area")
	ErrSelfIntersecting     = errors.New("polygon must not self-intersect")
	ErrDuplicateVertices    = errors.New("polygon must not contain duplicate consecutive vertices")
)

func ValidatePolygon(points []models.Point) error {
	if len(points) < 3 {
		return ErrInvalidPolygon
	}

	for i, p := range points {
		if err := validatePoint(p); err != nil {
			return fmt.Errorf("vertex %d: %w", i, err)
		}
		if i > 0 && pointsEqual(points[i], points[i-1]) {
			return ErrDuplicateVertices
		}
	}
	if pointsEqual(points[0], points[len(points)-1]) {
		return ErrDuplicateVertices
	}

	if polygonArea(points) < 1e-12 {
		return ErrDegeneratePolygon
	}

	if isSelfIntersecting(points) {
		return ErrSelfIntersecting
	}

	return nil
}

func validatePoint(p models.Point) error {
	if p.Lat < -90 || p.Lat > 90 || p.Lng < -180 || p.Lng > 180 {
		return ErrInvalidCoordinates
	}
	return nil
}

func pointsEqual(a, b models.Point) bool {
	const eps = 1e-9
	return math.Abs(a.Lat-b.Lat) < eps && math.Abs(a.Lng-b.Lng) < eps
}

func polygonArea(points []models.Point) float64 {
	n := len(points)
	if n < 3 {
		return 0
	}
	area := 0.0
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		area += points[i].Lng*points[j].Lat - points[j].Lng*points[i].Lat
	}
	return math.Abs(area) / 2.0
}

func segmentsIntersect(p1, p2, p3, p4 models.Point) bool {
	d1 := direction(p3, p4, p1)
	d2 := direction(p3, p4, p2)
	d3 := direction(p1, p2, p3)
	d4 := direction(p1, p2, p4)

	if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
		((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)) {
		return true
	}

	if d1 == 0 && onSegment(p3, p4, p1) {
		return true
	}
	if d2 == 0 && onSegment(p3, p4, p2) {
		return true
	}
	if d3 == 0 && onSegment(p1, p2, p3) {
		return true
	}
	if d4 == 0 && onSegment(p1, p2, p4) {
		return true
	}

	return false
}

func direction(pi, pj, pk models.Point) float64 {
	return (pk.Lng-pi.Lng)*(pj.Lat-pi.Lat) - (pj.Lng-pi.Lng)*(pk.Lat-pi.Lat)
}

func onSegment(pi, pj, pk models.Point) bool {
	return math.Min(pi.Lng, pj.Lng) <= pk.Lng && pk.Lng <= math.Max(pi.Lng, pj.Lng) &&
		math.Min(pi.Lat, pj.Lat) <= pk.Lat && pk.Lat <= math.Max(pi.Lat, pj.Lat)
}

func isSelfIntersecting(points []models.Point) bool {
	n := len(points)
	for i := 0; i < n; i++ {
		p1 := points[i]
		p2 := points[(i+1)%n]
		for j := i + 1; j < n; j++ {
			if i == j || (i+1)%n == j || i == (j+1)%n {
				continue
			}
			p3 := points[j]
			p4 := points[(j+1)%n]
			if segmentsIntersect(p1, p2, p3, p4) {
				return true
			}
		}
	}
	return false
}

// PointInPolygon uses the ray-casting algorithm to determine if a point lies inside a polygon.
func PointInPolygon(point models.Point, polygon []models.Point) bool {
	n := len(polygon)
	if n < 3 {
		return false
	}

	inside := false
	j := n - 1
	for i := 0; i < n; i++ {
		xi, yi := polygon[i].Lng, polygon[i].Lat
		xj, yj := polygon[j].Lng, polygon[j].Lat

		if ((yi > point.Lat) != (yj > point.Lat)) &&
			(point.Lng < (xj-xi)*(point.Lat-yi)/(yj-yi)+xi) {
			inside = !inside
		}
		j = i
	}
	return inside
}

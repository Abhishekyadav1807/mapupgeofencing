package services

import (
	"testing"

	"geofencing-system/models"
)

func TestValidatePolygon(t *testing.T) {
	tests := []struct {
		name    string
		points  []models.Point
		wantErr error
	}{
		{
			name: "valid triangle",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 0, Lng: 10},
				{Lat: 10, Lng: 0},
			},
			wantErr: nil,
		},
		{
			name: "valid square",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 0, Lng: 10},
				{Lat: 10, Lng: 10},
				{Lat: 10, Lng: 0},
			},
			wantErr: nil,
		},
		{
			name: "too few points",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 0, Lng: 10},
			},
			wantErr: ErrInvalidPolygon,
		},
		{
			name: "duplicate consecutive vertices",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 0, Lng: 10},
				{Lat: 0, Lng: 10},
				{Lat: 10, Lng: 0},
			},
			wantErr: ErrDuplicateVertices,
		},
		{
			name: "out of bounds coordinates",
			points: []models.Point{
				{Lat: -95, Lng: 0},
				{Lat: 0, Lng: 10},
				{Lat: 10, Lng: 0},
			},
			wantErr: ErrInvalidCoordinates,
		},
		{
			name: "degenerate polygon (collinear)",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 0, Lng: 5},
				{Lat: 0, Lng: 10},
			},
			wantErr: ErrDegeneratePolygon,
		},
		{
			name: "self-intersecting polygon (hourglass)",
			points: []models.Point{
				{Lat: 0, Lng: 0},
				{Lat: 10, Lng: 10},
				{Lat: 0, Lng: 10},
				{Lat: 5, Lng: 0},
			},
			wantErr: ErrSelfIntersecting,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePolygon(tt.points)
			if tt.wantErr == nil {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
			} else {
				if err == nil || (err.Error() != tt.wantErr.Error() && !containsError(err, tt.wantErr)) {
					t.Errorf("expected error %v, got %v", tt.wantErr, err)
				}
			}
		})
	}
}

func containsError(err, target error) bool {
	if err == nil || target == nil {
		return false
	}
	// Check if wrapped
	return len(err.Error()) >= len(target.Error()) && err.Error()[len(err.Error())-len(target.Error()):] == target.Error()
}

func TestPointInPolygon(t *testing.T) {
	polygon := []models.Point{
		{Lat: 0, Lng: 0},
		{Lat: 0, Lng: 10},
		{Lat: 10, Lng: 10},
		{Lat: 10, Lng: 0},
	}

	tests := []struct {
		name  string
		point models.Point
		want  bool
	}{
		{
			name:  "point inside",
			point: models.Point{Lat: 5, Lng: 5},
			want:  true,
		},
		{
			name:  "point outside",
			point: models.Point{Lat: 15, Lng: 5},
			want:  false,
		},
		{
			name:  "point far outside",
			point: models.Point{Lat: -5, Lng: -5},
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PointInPolygon(tt.point, polygon)
			if got != tt.want {
				t.Errorf("PointInPolygon(%v) = %v; want %v", tt.point, got, tt.want)
			}
		})
	}
}

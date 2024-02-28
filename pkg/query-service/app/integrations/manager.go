package integrations

import (
	"context"
	"fmt"
	"slices"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type IntegrationAuthor struct {
	Name     string
	Email    string
	HomePage string
}
type IntegrationSummary struct {
	Id          string
	Title       string
	Description string // A short description

	Author IntegrationAuthor
}

type IntegrationAssets struct {
	// Each integration is expected to specify all log transformations
	// in a single pipeline with a source based filter
	LogPipeline *logparsingpipeline.PostablePipeline

	// TBD: Dashboards, alerts, saved views, facets (indexed attribs)...
}

type IntegrationDetails struct {
	IntegrationSummary
	IntegrationAssets
}

type IntegrationsListItem struct {
	IntegrationSummary
	IsInstalled bool
}

type InstalledIntegration struct {
	IntegrationId string                     `db:"integration_id"`
	Config        InstalledIntegrationConfig `db:"config_json"`
	InstalledAt   time.Time                  `db:"installed_at"`
}
type InstalledIntegrationConfig map[string]interface{}

type Integration struct {
	IntegrationDetails
	Installation *InstalledIntegration
}

type Manager struct {
	availableIntegrationsRepo AvailableIntegrationsRepo
	installedIntegrationsRepo InstalledIntegrationsRepo
}

type IntegrationsFilter struct {
	IsInstalled *bool
}

func (m *Manager) ListIntegrations(
	ctx context.Context,
	filter *IntegrationsFilter,
	// Expected to have pagination over time.
) ([]IntegrationsListItem, *model.ApiError) {
	available, apiErr := m.availableIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch available integrations",
		)
	}

	installed, apiErr := m.installedIntegrationsRepo.list(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integrations",
		)
	}
	installedIds := []string{}
	for _, ii := range installed {
		installedIds = append(installedIds, ii.IntegrationId)
	}

	result := []IntegrationsListItem{}
	for _, ai := range available {
		result = append(result, IntegrationsListItem{
			IntegrationSummary: ai.IntegrationSummary,
			IsInstalled:        slices.Contains(installedIds, ai.Id),
		})
	}

	if filter != nil {
		if filter.IsInstalled != nil {
			filteredResult := []IntegrationsListItem{}
			for _, r := range result {
				if r.IsInstalled == *filter.IsInstalled {
					filteredResult = append(filteredResult, r)
				}
			}
			result = filteredResult
		}
	}

	return result, nil
}

func (m *Manager) GetIntegration(
	ctx context.Context,
	integrationId string,
) (*Integration, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	installation, apiErr := m.getInstalledIntegration(
		ctx, integrationId,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	return &Integration{
		IntegrationDetails: *integrationDetails,
		Installation:       installation,
	}, nil
}

func (m *Manager) InstallIntegration(
	ctx context.Context,
	integrationId string,
	config InstalledIntegrationConfig,
) (*IntegrationsListItem, *model.ApiError) {
	integrationDetails, apiErr := m.getIntegrationDetails(ctx, integrationId)
	if apiErr != nil {
		return nil, apiErr
	}

	_, apiErr = m.installedIntegrationsRepo.upsert(
		ctx, integrationId, config,
	)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not insert installed integration",
		)
	}

	return &IntegrationsListItem{
		IntegrationSummary: integrationDetails.IntegrationSummary,
		IsInstalled:        true,
	}, nil
}

func (m *Manager) UninstallIntegration(
	ctx context.Context,
	integrationId string,
) *model.ApiError {
	return m.installedIntegrationsRepo.delete(ctx, integrationId)
}

// Helpers.
func (m *Manager) getIntegrationDetails(
	ctx context.Context,
	integrationId string,
) (*IntegrationDetails, *model.ApiError) {
	ais, apiErr := m.availableIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not fetch integration: %s", integrationId,
		))
	}

	integrationDetails, wasFound := ais[integrationId]
	if !wasFound {
		return nil, model.NotFoundError(fmt.Errorf(
			"could not find integration: %s", integrationId,
		))
	}
	return &integrationDetails, nil
}

func (m *Manager) getInstalledIntegration(
	ctx context.Context,
	integrationId string,
) (*InstalledIntegration, *model.ApiError) {
	iis, apiErr := m.installedIntegrationsRepo.get(
		ctx, []string{integrationId},
	)
	if apiErr != nil {
		return nil, model.WrapApiError(apiErr, fmt.Sprintf(
			"could not fetch installed integration: %s", integrationId,
		))
	}

	installation, wasFound := iis[integrationId]
	if !wasFound {
		return nil, nil
	}
	return &installation, nil
}

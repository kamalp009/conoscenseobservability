package tests

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"testing"

	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// Higher level tests for UI facing APIs

func TestSignozIntegrationLifeCycle(t *testing.T) {
	require := require.New(t)
	testbed := NewIntegrationsTestBed(t)

	installedResp := testbed.GetInstalledIntegrationsFromQS()
	require.Equal(
		len(installedResp.Integrations), 0,
		"no integrations should be installed at the beginning",
	)

	availableResp := testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations := availableResp.Integrations
	require.Greater(
		len(availableIntegrations), 0,
		"some integrations should come bundled with SigNoz",
	)

	// Should be able to install integration
	require.False(availableIntegrations[0].IsInstalled)
	testbed.RequestQSToInstallIntegration(
		availableIntegrations[0].Id, map[string]interface{}{},
	)

	ii := testbed.GetIntegrationDetailsFromQS(availableIntegrations[0].Id)
	require.Equal(ii.Id, availableIntegrations[0].Id)
	require.NotNil(ii.Installation)

	installedResp = testbed.GetInstalledIntegrationsFromQS()
	installedIntegrations := installedResp.Integrations
	require.Equal(len(installedIntegrations), 1)
	require.Equal(installedIntegrations[0].Id, availableIntegrations[0].Id)

	availableResp = testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations = availableResp.Integrations
	require.Greater(len(availableIntegrations), 0)

	// Integration connection status should get updated after signal data has been received.
	testbed.mockLogQueryResponse([]model.SignozLog{})
	connectionStatus := testbed.GetIntegrationConnectionStatus(ii.Id)
	require.NotNil(connectionStatus)
	require.Nil(connectionStatus.Logs)

	testLog := makeTestSignozLog("test log body", map[string]interface{}{
		"source": "nginx",
	})
	testbed.mockLogQueryResponse([]model.SignozLog{testLog})
	connectionStatus = testbed.GetIntegrationConnectionStatus(ii.Id)
	require.NotNil(connectionStatus)
	require.NotNil(connectionStatus.Logs)
	require.Equal(connectionStatus.Logs.LastReceivedTsMillis, int64(testLog.Timestamp/1000000))

	// Should be able to uninstall integration
	require.True(availableIntegrations[0].IsInstalled)
	testbed.RequestQSToUninstallIntegration(
		availableIntegrations[0].Id,
	)

	ii = testbed.GetIntegrationDetailsFromQS(availableIntegrations[0].Id)
	require.Equal(ii.Id, availableIntegrations[0].Id)
	require.Nil(ii.Installation)

	installedResp = testbed.GetInstalledIntegrationsFromQS()
	installedIntegrations = installedResp.Integrations
	require.Equal(len(installedIntegrations), 0)

	availableResp = testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations = availableResp.Integrations
	require.Greater(len(availableIntegrations), 0)
	require.False(availableIntegrations[0].IsInstalled)
}

type IntegrationsTestBed struct {
	t              *testing.T
	testUser       *model.User
	qsHttpHandler  http.Handler
	mockClickhouse mockhouse.ClickConnMockCommon
}

func (tb *IntegrationsTestBed) GetAvailableIntegrationsFromQS() *integrations.IntegrationsListResponse {
	result := tb.RequestQS("/api/v1/integrations", nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationsResp integrations.IntegrationsListResponse
	err = json.Unmarshal(dataJson, &integrationsResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &integrationsResp
}

func (tb *IntegrationsTestBed) GetInstalledIntegrationsFromQS() *integrations.IntegrationsListResponse {
	result := tb.RequestQS("/api/v1/integrations?is_installed=true", nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationsResp integrations.IntegrationsListResponse
	err = json.Unmarshal(dataJson, &integrationsResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &integrationsResp
}

func (tb *IntegrationsTestBed) GetIntegrationDetailsFromQS(
	integrationId string,
) *integrations.Integration {
	result := tb.RequestQS(fmt.Sprintf(
		"/api/v1/integrations/%s", integrationId,
	), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationResp integrations.Integration
	err = json.Unmarshal(dataJson, &integrationResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json")
	}

	return &integrationResp
}

func (tb *IntegrationsTestBed) GetIntegrationConnectionStatus(
	integrationId string,
) *integrations.IntegrationConnectionStatus {
	result := tb.RequestQS(fmt.Sprintf(
		"/api/v1/integrations/%s/connection_status", integrationId,
	), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var connectionStatus integrations.IntegrationConnectionStatus
	err = json.Unmarshal(dataJson, &connectionStatus)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json")
	}

	return &connectionStatus
}

func (tb *IntegrationsTestBed) RequestQSToInstallIntegration(
	integrationId string, config map[string]interface{},
) {
	request := integrations.InstallIntegrationRequest{
		IntegrationId: integrationId,
		Config:        config,
	}
	tb.RequestQS("/api/v1/integrations/install", request)
}

func (tb *IntegrationsTestBed) RequestQSToUninstallIntegration(
	integrationId string,
) {
	request := integrations.UninstallIntegrationRequest{
		IntegrationId: integrationId,
	}
	tb.RequestQS("/api/v1/integrations/uninstall", request)
}

func (tb *IntegrationsTestBed) RequestQS(
	path string,
	postData interface{},
) *app.ApiResponse {
	req, err := NewAuthenticatedTestRequest(
		tb.testUser, path, postData,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	respWriter := httptest.NewRecorder()
	tb.qsHttpHandler.ServeHTTP(respWriter, req)
	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		tb.t.Fatalf("couldn't read response body received from QS: %v", err)
	}

	if response.StatusCode != 200 {
		tb.t.Fatalf(
			"unexpected response status from query service for path %s. status: %d, body: %v\n%v",
			path, response.StatusCode, string(responseBody), string(debug.Stack()),
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		tb.t.Fatalf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			string(responseBody),
		)
	}

	return &result
}

func (tb *IntegrationsTestBed) mockLogQueryResponse(logsInResponse []model.SignozLog) {
	addLogsQueryExpectation(tb.mockClickhouse, logsInResponse)
}

func NewIntegrationsTestBed(t *testing.T) *IntegrationsTestBed {
	testDB, testDBFilePath := integrations.NewTestSqliteDB(t)

	// TODO(Raj): This should not require passing in the DB file path
	dao.InitDao("sqlite", testDBFilePath)

	controller, err := integrations.NewController(testDB)
	if err != nil {
		t.Fatalf("could not create integrations controller: %v", err)
	}

	fm := featureManager.StartManager()
	reader, mockClickhouse := NewMockClickhouseReader(t, testDB, fm)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		Reader:                 reader,
		AppDao:                 dao.DB(),
		IntegrationsController: controller,
		FeatureFlags:           fm,
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	router := app.NewRouter()
	am := app.NewAuthMiddleware(auth.GetUserFromRequest)
	apiHandler.RegisterIntegrationRoutes(router, am)

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	return &IntegrationsTestBed{
		t:              t,
		testUser:       user,
		qsHttpHandler:  router,
		mockClickhouse: mockClickhouse,
	}
}

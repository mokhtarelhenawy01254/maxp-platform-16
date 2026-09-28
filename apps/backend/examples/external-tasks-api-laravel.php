<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final class ExternalTasksApiService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct(?string $baseUrl = null, ?string $apiKey = null)
    {
        $this->baseUrl = rtrim(
            $baseUrl ?: (string) config('services.external_tasks.base_url', 'http://localhost:3007/api/v1/external/tasks'),
            '/'
        );

        $this->apiKey = $apiKey ?: (string) config('services.external_tasks.api_key');
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->acceptJson()
            ->withHeaders([
                'x-api-key' => $this->apiKey,
            ]);
    }

    public function listUsers(): array
    {
        return $this->client()
            ->get('/users')
            ->throw()
            ->json();
    }

    public function listTasks(array $query = []): array
    {
        return $this->client()
            ->get('/', $query)
            ->throw()
            ->json();
    }

    public function createTask(array $payload): array
    {
        return $this->client()
            ->post('/', [
                'title' => $payload['title'],
                'description' => $payload['description'],
                'priority' => $payload['priority'] ?? 'MEDIUM',
                'type' => $payload['type'] ?? 'general',
                'assignedTo' => $payload['assignedTo'] ?? null,
                'projectId' => $payload['projectId'] ?? null,
                'dueDate' => $payload['dueDate'] ?? null,
                'startDate' => $payload['startDate'] ?? null,
                'estimatedHours' => $payload['estimatedHours'] ?? 0,
                'tags' => $payload['tags'] ?? [],
            ])
            ->throw()
            ->json();
    }

    public function getTask(string $taskId): array
    {
        return $this->client()
            ->get("/{$taskId}")
            ->throw()
            ->json();
    }

    public function updateTask(string $taskId, array $payload): array
    {
        return $this->client()
            ->patch("/{$taskId}", $payload)
            ->throw()
            ->json();
    }

    public function updateTaskStatus(string $taskId, string $status, ?int $progress = null): array
    {
        return $this->client()
            ->patch("/{$taskId}/status", [
                'status' => $status,
                'progress' => $progress,
            ])
            ->throw()
            ->json();
    }
}

/*
|--------------------------------------------------------------------------
| Example usage inside Laravel
|--------------------------------------------------------------------------
|
| Put in config/services.php:
|
| 'external_tasks' => [
|     'base_url' => env('TASKS_API_BASE_URL', 'http://localhost:3007/api/v1/external/tasks'),
|     'api_key' => env('TASKS_API_KEY'),
| ],
|
| Example:
|
| $service = app(\App\Services\ExternalTasksApiService::class);
| $users = $service->listUsers();
| $assignedTo = $users['data'][0]['id'] ?? null;
|
| $createdTask = $service->createTask([
|     'title' => 'Laravel Integration Task',
|     'description' => 'Created from a Laravel application',
|     'priority' => 'HIGH',
|     'assignedTo' => $assignedTo,
|     'tags' => ['laravel', 'external-api'],
| ]);
|
| $taskId = $createdTask['data']['id'];
| $service->updateTask($taskId, [
|     'title' => 'Laravel Integration Task - Updated',
|     'description' => 'Updated task description from Laravel service',
|     'priority' => 'URGENT',
|     'tags' => ['laravel', 'external-api', 'updated'],
| ]);
| $service->updateTaskStatus($taskId, 'IN_PROGRESS', 60);
| $task = $service->getTask($taskId);
|
*/

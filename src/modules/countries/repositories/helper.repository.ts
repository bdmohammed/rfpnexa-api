import { WorkflowStatus } from '../countries.dto';

import type { CountryHierarchyDto, StateHierarchyDto, UserSummary } from '../countries.dto';
import type { Country } from '@/database/entities/Country';
import type { CountryChangeRequest } from '@/database/entities/CountryChangeRequest';
import type { State } from '@/database/entities/State';
import type { User } from '@/database/entities/User';
import { COUNTRY, STATE } from '@/core/constants';
import { CountryChangeRequestStatus } from '@/types/enums';

export function buildWorkflowMap(
  requests: CountryChangeRequest[],
): Map<string, CountryChangeRequest> {
  return new Map(
    requests.map((request) => [
      request.stateId ? `${STATE}_${request.stateId}` : `${COUNTRY}_${request.countryId}`,
      request,
    ]),
  );
}

export function getWorkflowMetadata(
  request?: Pick<CountryChangeRequest, 'id' | 'requestNumber' | 'status'>,
) {
  if (!request) {
    return {
      workflowStatus: WorkflowStatus.NONE,
      activeRequestId: null,
      activeRequestNumber: null,
    };
  }

  return {
    workflowStatus:
      request.status === CountryChangeRequestStatus.IN_REVIEW
        ? WorkflowStatus.PENDING_REVIEW
        : WorkflowStatus.CHANGES_REQUESTED,
    activeRequestId: request.id,
    activeRequestNumber: request.requestNumber,
  };
}

function mapCountry(
  country: Country,
  workflowMap: Map<string, CountryChangeRequest>,
): CountryHierarchyDto {
  return {
    id: country.id,
    code: country.code,
    name: country.name,
    slug: country.slug,
    type: COUNTRY,
    isActive: country.isActive,
    updatedAt: country.updatedAt,
    ...getWorkflowMetadata(workflowMap.get(`${COUNTRY}_${country.id}`)),
    states: country.states.map((state) => mapState(state, workflowMap)),
  };
}

function mapState(state: State, workflowMap: Map<string, CountryChangeRequest>): StateHierarchyDto {
  return {
    id: state.id,
    countryId: state.countryId,
    code: state.code,
    name: state.name,
    slug: state.slug,
    type: state.type,
    isActive: state.isActive,
    updatedAt: state.updatedAt,
    ...getWorkflowMetadata(workflowMap.get(`${STATE}_${state.id}`)),
  };
}

export function mapCountriesHierarchy(
  countries: Country[],
  workflowMap: Map<string, CountryChangeRequest>,
): CountryHierarchyDto[] {
  return countries.map((country) => mapCountry(country, workflowMap));
}

export function toUserSummary(user: User | null): UserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
  };
}

import type { ApiResponse } from '@/types/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

/**
 * [WHAT]
 * Resolves an optional contract field to a concrete type, falling back to `Default`
 * when the field is `undefined`, and stripping any stray `undefined` from the result.
 *
 * [WHY]
 * `C['field'] extends undefined ? Default : C['field']` cannot fully resolve while `C`
 * is still generic — TypeScript defers it to `Default | C['field']`, and since optional
 * properties always include `undefined` in their type, that `undefined` leaks through
 * and fails downstream constraints (e.g. `Locals extends Record<string, any>`).
 * Running the conditional over a real type parameter (`Field`) instead of an indexed
 * access resolves this correctly, and `NonNullable` is a defensive backstop.
 */
type ResolveField<Field, Default> = NonNullable<Field extends undefined ? Default : Field>;

/**
 * [WHAT]
 * Declarative contract defining the input and output types of an HTTP route endpoint.
 *
 * [WHY]
 * Enables 100% end-to-end type safety connecting:
 * Route (validation schemas) => Controller (typed req/res) => Service (domain parameters and return types).
 *
 * @template TParams - URL path parameters (e.g. `{ id: string }`)
 * @template TReqBody - Request JSON body payload (e.g. `CreateTenderDto`)
 * @template TReqQuery - Query string parameters (e.g. `TenderSearchQueryDto`)
 * @template TResData - Domain entity or payload returned in `ApiResponse.data`
 * @template TMeta - Metadata payload returned in `ApiResponse.meta` (e.g. `PaginationMeta`)
 * @template TLocals - Express response locals dictionary
 */
export interface RouteContract<
  TParams = ParamsDictionary,
  TReqBody = unknown,
  TReqQuery = unknown,
  TResData = unknown,
  TMeta = unknown,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
> {
  params?: TParams;
  body?: TReqBody;
  query?: TReqQuery;
  response?: TResData;
  meta?: TMeta;
  locals?: TLocals;
}

/**
 * [WHAT]
 * Strongly typed Express Request for controller actions.
 *
 * [WHY]
 * Provides direct access to validated route parameters, body, and query with zero casting.
 */
export type TypedRequest<
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Request<P, unknown, ReqBody, ReqQuery, Locals>;

/**
 * [WHAT]
 * Strongly typed Express Response for controller actions returning standardized `ApiResponse`.
 */
export type TypedResponse<
  TData = unknown,
  TMeta = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Response<ApiResponse<TData, TMeta>, Locals>;

/**
 * [WHAT]
 * Controller handler function signature ordered naturally by data flow:
 * What goes IN (Params, Body, Query) => What comes OUT (Response Data, Meta).
 */
export type TypedRequestHandler<
  P = ParamsDictionary,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  TResData = unknown,
  TMeta = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request<P, ApiResponse<TResData, TMeta>, ReqBody, ReqQuery, Locals>,
  res: Response<ApiResponse<TResData, TMeta>, Locals>,
  next: NextFunction,
) => unknown | Promise<unknown>;

/**
 * [WHAT]
 * Type definition for asynchronous Express request handler functions (standard Express positional signature).
 *
 * [WHY]
 * Provides strongly-typed generic signatures for request parameters, bodies, queries, and response types.
 */
export type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => unknown | Promise<unknown>;

/**
 * Type-safe Request extractor from an `RouteContract`.
 */
export type ContractRequest<C extends RouteContract> = Request<
  ResolveField<C['params'], ParamsDictionary>,
  C['response'] extends undefined
    ? unknown
    : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
  ResolveField<C['body'], unknown>,
  ResolveField<C['query'], ParsedQs>,
  ResolveField<C['locals'], Record<string, unknown>>
>;

/**
 * Type-safe Response extractor from an `RouteContract`.
 */
export type ContractResponse<C extends RouteContract> = Response<
  C['response'] extends undefined
    ? unknown
    : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
  ResolveField<C['locals'], Record<string, unknown>>
>;

/**
 * Handler signature driven by a single `RouteContract`.
 */
export type ContractRequestHandler<C extends RouteContract> = (
  req: ContractRequest<C>,
  res: ContractResponse<C>,
  next: NextFunction,
) => unknown | Promise<unknown>;

/**
 * Interface representing the complete `asyncHandler` utility with positional, contract, and typed modes.
 */
export interface AsyncHandler {
  /**
   * Standard Express positional generic signature (100% backward-compatible):
   * `<P, ResBody, ReqBody, ReqQuery, Locals>`
   */
  <
    P = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    Locals extends Record<string, unknown> = Record<string, unknown>,
  >(
    handler: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>;

  /**
   * Contract-driven route handler wrapper.
   * Specify a single `RouteContract` object type to cleanly type:
   * - `req.params` (from `contract.params`)
   * - `req.body` (from `contract.body`)
   * - `req.query` (from `contract.query`)
   * - `res` (`ApiResponse<contract.response, contract.meta>`)
   *
   * @example
   * interface GetTenderContract {
   *   params: TenderIdParamDto;
   *   query: TenderSearchQueryDto;
   *   response: Tender;
   *   meta: PaginationMeta;
   * }
   * export const getTender = asyncHandler.contract<GetTenderContract>(async (req, res) => {
   *   const { tender, meta } = await service.getTender(req.params.id, req.query);
   *   return sendOk(res, tender, 'OK', meta);
   * });
   */
  contract<C extends RouteContract>(
    handler: ContractRequestHandler<C>,
  ): RequestHandler<
    ResolveField<C['params'], ParamsDictionary>,
    C['response'] extends undefined
      ? unknown
      : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
    ResolveField<C['body'], unknown>,
    ResolveField<C['query'], ParsedQs>,
    ResolveField<C['locals'], Record<string, unknown>>
  >;

  /**
   * Typed request/response handler ordered by data flow:
   * What goes IN (Params, Body, Query) => What comes OUT (Response Data, Meta).
   *
   * @example
   * export const listTenders = asyncHandler.typed<{}, {}, TenderSearchQueryDto, Tender[], PaginationMeta>(
   *   async (req, res) => {
   *     const { tenders, total, page, limit } = await tenderService.list(req.query);
   *     return sendOk(res, tenders, 'OK', paginationMeta(total, page, limit));
   *   }
   * );
   */
  typed<
    P = ParamsDictionary,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    TResData = unknown,
    TMeta = unknown,
    Locals extends Record<string, unknown> = Record<string, unknown>,
  >(
    handler: TypedRequestHandler<P, ReqBody, ReqQuery, TResData, TMeta, Locals>,
  ): RequestHandler<P, ApiResponse<TResData, TMeta>, ReqBody, ReqQuery, Locals>;
}

/**
 * Base implementation of `asyncHandler` wrapping route execution in exception and promise handlers.
 */
const baseAsyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  handler: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * [WHAT]
 * Higher-order function wrapper for Express route handlers catching promise rejections and synchronous throws.
 *
 * [WHY]
 * Eliminates repetitive try/catch boilerplate in controllers by routing unhandled errors directly to `next(err)`.
 * Provides 100% type safety from route parameters and validation through controller logic to domain services.
 */
export const asyncHandler: AsyncHandler = Object.assign(baseAsyncHandler, {
  contract: <C extends RouteContract>(
    handler: ContractRequestHandler<C>,
  ): RequestHandler<
    ResolveField<C['params'], ParamsDictionary>,
    C['response'] extends undefined
      ? unknown
      : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
    ResolveField<C['body'], unknown>,
    ResolveField<C['query'], ParsedQs>,
    ResolveField<C['locals'], Record<string, unknown>>
  > =>
    baseAsyncHandler(
      handler as unknown as AsyncRequestHandler<
        ResolveField<C['params'], ParamsDictionary>,
        C['response'] extends undefined
          ? unknown
          : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
        ResolveField<C['body'], unknown>,
        ResolveField<C['query'], ParsedQs>,
        ResolveField<C['locals'], Record<string, unknown>>
      >,
    ) as unknown as RequestHandler<
      ResolveField<C['params'], ParamsDictionary>,
      C['response'] extends undefined
        ? unknown
        : ApiResponse<C['response'], ResolveField<C['meta'], unknown>>,
      ResolveField<C['body'], unknown>,
      ResolveField<C['query'], ParsedQs>,
      ResolveField<C['locals'], Record<string, unknown>>
    >,

  typed: <
    P = ParamsDictionary,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    TResData = unknown,
    TMeta = unknown,
    Locals extends Record<string, unknown> = Record<string, unknown>,
  >(
    handler: TypedRequestHandler<P, ReqBody, ReqQuery, TResData, TMeta, Locals>,
  ): RequestHandler<P, ApiResponse<TResData, TMeta>, ReqBody, ReqQuery, Locals> =>
    baseAsyncHandler<P, ApiResponse<TResData, TMeta>, ReqBody, ReqQuery, Locals>(handler),
});

/**
 * Standalone alias for `asyncHandler.contract`.
 */
export const contractAsyncHandler = asyncHandler.contract;

/**
 * Standalone alias for `asyncHandler.typed`.
 */
export const typedAsyncHandler = asyncHandler.typed;

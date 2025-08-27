// Service exports
export { ProductService } from "./product-service";
export { VariationService } from "./variation-service";
export {
  CompositionService,
  type CompositionTreeNode,
} from "./composition-service";

// Import types for the factory
import { ProductService } from "./product-service";
import { VariationService } from "./variation-service";
import { CompositionService } from "./composition-service";

// Service factory for dependency injection
export class ServiceFactory {
  private static instance: ServiceFactory;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  createProductService(): typeof ProductService {
    // In a real application, you might use a DI container
    const {
      ProductRepository,
      ProductVariationItemRepository,
      CompositionItemRepository,
    } = require("../../storage/repositories");

    return ProductService;
  }

  createVariationService(): typeof VariationService {
    const {
      VariationTypeRepository,
      VariationRepository,
      ProductVariationItemRepository,
    } = require("../../storage/repositories");

    return VariationService;
  }

  createCompositionService(): CompositionService {
    const {
      CompositionItemRepository,
      ProductRepository,
      ProductVariationItemRepository,
    } = require("../../storage/repositories");
    return new CompositionService(
      new CompositionItemRepository(),
      new ProductRepository(),
      new ProductVariationItemRepository()
    );
  }
}

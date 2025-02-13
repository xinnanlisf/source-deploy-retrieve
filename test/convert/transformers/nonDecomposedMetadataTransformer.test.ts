/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { createSandbox } from 'sinon';
import { nonDecomposed } from '../../mock';
import { NonDecomposedMetadataTransformer } from '../../../src/convert/transformers/nonDecomposedMetadataTransformer';
import { ComponentSet, registry, RegistryAccess, SourceComponent } from '../../../src';
import { ConvertContext } from '../../../src/convert/convertContext';

const env = createSandbox();

describe('NonDecomposedMetadataTransformer', () => {
  const component = nonDecomposed.COMPONENT_1;
  const registryAccess = new RegistryAccess();

  afterEach(() => env.restore());

  describe('toMetadataFormat', () => {
    it('should defer write operations and set context state', async () => {
      const [child1, child2] = component.getChildren();

      const context = new ConvertContext();
      const transformer = new NonDecomposedMetadataTransformer(registryAccess, context);

      expect(await transformer.toMetadataFormat(child1)).to.deep.equal([]);
      expect(await transformer.toMetadataFormat(child2)).to.deep.equal([]);
      const expected = JSON.parse(
        JSON.stringify({
          [component.fullName]: {
            component,
            children: new ComponentSet([child1, child2]),
          },
        })
      );
      expect(JSON.parse(JSON.stringify(context.recomposition.state))).to.deep.equal(expected);
    });
  });

  describe('toSourceFormat', () => {
    it('should defer write operations and set context state for unclaimed children', async () => {
      const context = new ConvertContext();
      const transformer = new NonDecomposedMetadataTransformer(registryAccess, context);

      const result = await transformer.toSourceFormat(component);
      expect(result).to.deep.equal([]);
      expect(context.decomposition.state).to.deep.equal({});
      expect(context.recomposition.state).to.deep.equal({});

      expect(context.nonDecomposition.state).to.deep.equal({
        childrenByUniqueElement: new Map([
          [nonDecomposed.CHILD_1_NAME, nonDecomposed.CHILD_1_XML],
          [nonDecomposed.CHILD_2_NAME, nonDecomposed.CHILD_2_XML],
        ]),
        exampleComponent: component,
      });
    });

    it('should defer write operations and set context state for claimed children', async () => {
      const context = new ConvertContext();
      const transformer = new NonDecomposedMetadataTransformer(registryAccess, context);
      const componentToConvert = SourceComponent.createVirtualComponent(
        {
          name: component.type.name,
          type: registry.types.customlabels,
          xml: component.xml,
        },
        []
      );
      env.stub(componentToConvert, 'parseXml').resolves(nonDecomposed.FULL_XML_CONTENT);
      env.stub(componentToConvert, 'parseXmlSync').returns(nonDecomposed.FULL_XML_CONTENT);

      const result = await transformer.toSourceFormat(componentToConvert, component);
      expect(result).to.deep.equal([]);
      expect(context.nonDecomposition.state).to.deep.equal({
        childrenByUniqueElement: new Map([
          [nonDecomposed.CHILD_1_NAME, nonDecomposed.CHILD_1_XML],
          [nonDecomposed.CHILD_2_NAME, nonDecomposed.CHILD_2_XML],
          [nonDecomposed.UNCLAIMED_CHILD_NAME, nonDecomposed.UNCLAIMED_CHILD_XML],
          [nonDecomposed.CHILD_3_NAME, nonDecomposed.CHILD_3_XML],
        ]),
        exampleComponent: componentToConvert,
      });
    });
  });
});

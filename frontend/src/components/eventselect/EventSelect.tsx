/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { Button, SelectProps } from '@cloudscape-design/components';
import React from 'react';
import { ALPHABETS } from 'ts/const';
import {
  CategoryItemType,
  ERelationShip,
  IAnalyticsItem,
  IEventAnalyticsItem,
} from './AnalyticsType';
import ConditionItem from './ConditionItem';
import EventItem from './EventItem';
import RelationAnd from './comps/RelationAnd';
import RelationOr from './comps/RelationOr';

interface EventsSelectProps {
  data: IEventAnalyticsItem[];
  eventOptionList: CategoryItemType[];
  addNewEventAnalyticsItem: () => void;
  removeEventItem: (index: number) => void;
  addNewConditionItem: (index: number) => void;
  removeEventCondition: (eventIndex: number, conditionIndex: number) => void;
  changeConditionOperator: (
    eventIndex: number,
    conditionIndex: number,
    operator: SelectProps.Option | null
  ) => void;
  changeConditionCategoryOption: (
    eventIndex: number,
    conditionIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeConditionValue: (
    eventIndex: number,
    conditionIndex: number,
    value: any
  ) => void;
  changeCurCategoryOption: (
    eventIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeCurCalcMethodOption?: (
    eventIndex: number,
    calcMethod: IAnalyticsItem | null
  ) => void;
  changeCurRelationShip?: (eventIndex: number, relation: ERelationShip) => void;
}
const EventsSelect: React.FC<EventsSelectProps> = (
  props: EventsSelectProps
) => {
  const {
    data,
    eventOptionList,
    addNewEventAnalyticsItem,
    removeEventItem,
    addNewConditionItem,
    removeEventCondition,
    changeConditionOperator,
    changeConditionValue,
    changeCurCategoryOption,
    changeConditionCategoryOption,
    changeCurCalcMethodOption,
    changeCurRelationShip,
  } = props;

  return (
    <div className="cs-analytics-dropdown">
      {data.map((element, index) => {
        return (
          <div key={index}>
            <div className="cs-analytics-parameter">
              <div className="cs-para-name">
                {(element.customOrderName && element.customOrderName) ||
                  (element?.listOrderType === 'alpahbet'
                    ? ALPHABETS[index]
                    : index + 1)}
              </div>
              <div className="flex-1">
                <EventItem
                  calcMethodOption={element.calculateMethodOption}
                  categoryOption={element.selectedEventOption}
                  changeCurCategoryOption={(item) => {
                    changeCurCategoryOption(index, item);
                  }}
                  changeCurCalcMethodOption={(method) => {
                    changeCurCalcMethodOption &&
                      changeCurCalcMethodOption(index, method);
                  }}
                  hasTab={element.hasTab}
                  isMultiSelect={element.isMultiSelect}
                  categories={eventOptionList}
                />
              </div>
              <div className="ml-5">
                <Button
                  onClick={() => {
                    addNewConditionItem(index);
                  }}
                  variant="link"
                  iconName="add-plus"
                />
              </div>
              <div className="event-delete">
                {index > 0 && (
                  <span className="remove-icon">
                    <Button
                      onClick={() => {
                        removeEventItem(index);
                      }}
                      variant="link"
                      iconName="close"
                    />
                  </span>
                )}
              </div>
            </div>
            <div className="flex">
              {element.conditionList.length > 1 &&
                element.conditionRelationShip === ERelationShip.AND && (
                  <RelationAnd
                    enableChangeRelation={element.enableChangeRelation}
                    onClick={() => {
                      element.enableChangeRelation &&
                        changeCurRelationShip &&
                        changeCurRelationShip(index, ERelationShip.OR);
                    }}
                  />
                )}
              {element.conditionList.length > 1 &&
                element.conditionRelationShip === ERelationShip.OR && (
                  <RelationOr
                    enableChangeRelation={element.enableChangeRelation}
                    onClick={() => {
                      element.enableChangeRelation &&
                        changeCurRelationShip &&
                        changeCurRelationShip(index, ERelationShip.AND);
                    }}
                  />
                )}
              <div className="cs-analytics-param-events">
                {element.conditionList.length > 0 &&
                  element.conditionList.map((element, cIndex) => {
                    return (
                      <ConditionItem
                        item={element}
                        key={cIndex}
                        removeConditionItem={() => {
                          removeEventCondition(index, cIndex);
                        }}
                        changeCurCategoryOption={(category) => {
                          changeConditionCategoryOption(
                            index,
                            cIndex,
                            category
                          );
                        }}
                        changeConditionOperator={(item) => {
                          changeConditionOperator(index, cIndex, item);
                        }}
                        changeConditionValue={(value) => {
                          changeConditionValue(index, cIndex, value);
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="mt-10">
        <Button iconName="add-plus" onClick={addNewEventAnalyticsItem}>
          事件指标
        </Button>
      </div>
    </div>
  );
};

export default EventsSelect;
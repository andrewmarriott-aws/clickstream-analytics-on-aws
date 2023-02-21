import {
  AppLayout,
  Box,
  Cards,
  Link,
  Pagination,
  StatusIndicator,
  TextFilter,
} from '@cloudscape-design/components';
import { getProjectList } from 'apis/project';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectsHeader from './comps/ProjectsHeader';
import SplitPanelContent from './comps/SplitPanel';

interface ContentProps {
  selectedItems: IProject[];
  changeSelectedItems: (item: IProject[]) => void;
}

const Content: React.FC<ContentProps> = (props: ContentProps) => {
  const { t } = useTranslation();
  const { selectedItems, changeSelectedItems } = props;
  const [pageSize] = useState(12);
  const [loadingData, setLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [projectList, setProjectList] = useState<IProject[]>([]);
  const CARD_DEFINITIONS = {
    header: (item: IProject) => (
      <div>
        <Link fontSize="heading-m" href={`/project/detail/${item.projectId}`}>
          {item.name}
        </Link>
      </div>
    ),
    sections: [
      {
        id: 'name',
        header: t('project:list.name'),
        content: (item: IProject) => item.name,
      },
      {
        id: 'projectId',
        header: t('project:list.id'),
        content: (item: IProject) => item.projectId,
      },
      {
        id: 'projectPlatform',
        header: t('project:list.platform'),
        content: (item: IProject) => item.platform || '-',
      },

      {
        id: 'status',
        header: t('project:list.status'),
        content: (item: IProject) => (
          <StatusIndicator
            type={item.status === 'Deactivated' ? 'error' : 'success'}
          >
            {item.status}
          </StatusIndicator>
        ),
      },
    ],
  };

  const listProjects = async () => {
    setLoadingData(true);
    const { success, data }: ApiResponse<ResponseTableData<IProject>> =
      await getProjectList({
        pageNumber: currentPage,
        pageSize: pageSize,
      });
    if (success) {
      setProjectList(data.items);
      setTotalCount(data.totalCount);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    listProjects();
  }, [currentPage]);

  return (
    <div className="pb-30">
      <Cards
        selectedItems={selectedItems}
        onSelectionChange={(event) => {
          changeSelectedItems(event.detail.selectedItems);
        }}
        empty={
          <Box textAlign="center" color="inherit">
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('noData')}
            </Box>
          </Box>
        }
        loading={loadingData}
        stickyHeader={false}
        cardDefinition={CARD_DEFINITIONS}
        loadingText={t('project:list.loading') || ''}
        items={projectList}
        selectionType="single"
        variant="full-page"
        header={
          <ProjectsHeader
            project={selectedItems?.[0]}
            refreshPage={() => {
              changeSelectedItems([]);
              listProjects();
            }}
          />
        }
        filter={
          <TextFilter
            filteringAriaLabel={t('project:list.filter') || ''}
            filteringPlaceholder={t('project:list.find') || ''}
            filteringText=""
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.ceil(totalCount / pageSize)}
            onChange={(e) => {
              setCurrentPage(e.detail.currentPageIndex);
            }}
          />
        }
      />
    </div>
  );
};

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.projects'),
      href: '/',
    },
  ];
  const [showSplit, setShowSplit] = useState(false);
  const [selectedItems, setSelectedItems] = useState<IProject[]>([]);

  useEffect(() => {
    if (selectedItems.length === 1) {
      setShowSplit(true);
    }
  }, [selectedItems]);

  return (
    <AppLayout
      content={
        <Content
          selectedItems={selectedItems}
          changeSelectedItems={(items) => {
            setSelectedItems(items);
          }}
        />
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={
        selectedItems.length > 0 ? (
          <SplitPanelContent project={selectedItems?.[0]} />
        ) : (
          ''
        )
      }
    />
  );
};

export default Projects;
